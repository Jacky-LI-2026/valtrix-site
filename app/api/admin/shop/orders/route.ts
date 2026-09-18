import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getSalesViewer } from "@/lib/server/sales-user";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

// GET /api/admin/shop/orders?page=1&limit=20&keyword=&status=&format=csv
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const keyword = searchParams.get("keyword")?.trim() || "";
  const status = searchParams.get("status") || "";
  const followup = searchParams.get("followup") || "";
  const format = searchParams.get("format") || "";

  const where: any = {};
  if (status) where.status = status;
  if (followup === "1") {
    // 待跟进：有分配销售且未响应、未完成/未取消
    where.salesUserId = { not: null };
    where.respondedAt = null;
    where.status = { notIn: ["cancelled", "completed"] };
  }

  // 销售权限：非管理员销售仅可见分配给自己的订单（管理员/非销售用户全量）
  const viewer = await getSalesViewer(session?.user);
  const restrictToSelf = viewer.isSales && !viewer.isAdmin;
  if (restrictToSelf && viewer.userId) {
    where.salesUserId = viewer.userId;
  }
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
      { email: { contains: keyword } },
      { company: { contains: keyword } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.shopOrder.count({ where }),
    prisma.shopOrder.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { salesUser: { select: { id: true, username: true, displayName: true, email: true } } },
    }),
  ]);

  // 批量关联会员信息（避免 include 泛型问题，N 小订单量可忽略）
  const memberIds = Array.from(new Set(items.filter((o: any) => o.memberId).map((o: any) => o.memberId.toString())));
  const members = memberIds.length
    ? await prisma.member.findMany({ where: { id: { in: memberIds.map(BigInt) } }, select: { id: true, email: true, name: true, phone: true } })
    : [];
  const memberMap = new Map(members.map((m) => [m.id.toString(), m]));

  const mapOrder = (o: any) => {
    const mb = o.memberId ? memberMap.get(o.memberId.toString()) : null;
    return {
    id: o.id.toString(),
    orderNo: o.orderNo,
    name: o.name,
    phone: o.phone,
    email: o.email,
    company: o.company,
    memberId: o.memberId ? o.memberId.toString() : null,
    memberEmail: mb?.email || null,
    memberName: mb?.name || null,
    memberPhone: mb?.phone || null,
    amount: Number(o.amount),
    discountAmount: Number(o.discountAmount),
    couponCode: o.couponCode,
    currency: o.currency,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status] || o.status,
    payMethod: o.payMethod,
    items: o.items,
    remark: o.remark,
    ipInfo: o.ipInfo,
    shippingCompany: o.shippingCompany,
    trackingNo: o.trackingNo,
    poNo: o.poNo,
    invoiceTitle: o.invoiceTitle,
    taxNo: o.taxNo,
    payStatus: o.payStatus,
    payVoucher: o.payVoucher,
    paidAt: o.paidAt,
    shippedAt: o.shippedAt,
    shippingStatus: o.shippingStatus,
    deliveredAt: o.deliveredAt,
    history: o.history,
    createdAt: o.createdAt,
    // 销售跟进
    salesUserId: o.salesUserId ? o.salesUserId.toString() : null,
    salesUser: o.salesUser ? { id: o.salesUser.id.toString(), username: o.salesUser.username, displayName: o.salesUser.displayName, email: o.salesUser.email } : null,
    assignedAt: o.assignedAt,
    respondedAt: o.respondedAt,
    escalationCount: Number(o.escalationCount) || 0,
    };
  };

  if (format === "csv") {
    const rows = [
      "订单号,客户,电话,邮箱,公司,会员账号,金额(元),支付方式,状态,商品明细,创建时间",
      ...items.map((o: any) => {
        const detail = (o.items as any[] || [])
          .map((i) => `${i.name}×${i.qty}`)
          .join(";");
        const ip = o.ipInfo ? `${(o.ipInfo as any).ip || ""} ${(o.ipInfo as any).country || ""} ${(o.ipInfo as any).city || ""}`.trim() : "";
        return [
          o.orderNo,
          `"${(o.name || "").replace(/"/g, '""')}"`,
          `"${(o.phone || "").replace(/"/g, '""')}"`,
          o.email,
          `"${(o.company || "").replace(/"/g, '""')}"`,
          o.member?.email || (o.memberId ? (memberMap.get(o.memberId.toString())?.email || "") : ""),
          Number(o.amount),
          o.payMethod,
          STATUS_LABEL[o.status] || o.status,
          `"${detail.replace(/"/g, '""')}"`,
          o.createdAt.toISOString(),
        ].join(",");
      }),
    ];
    const csv = "\uFEFF" + rows.join("\r\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="shop-orders.csv"' },
    });
  }

  const sum = (await prisma.shopOrder.aggregate({ _sum: { amount: true }, where }))._sum.amount;
  const baseScope: any = {};
  if (restrictToSelf && viewer.userId) baseScope.salesUserId = viewer.userId;
  const pendingWhere: any = { status: "pending", ...baseScope };
  const shipPendingWhere: any = {
    status: "confirmed",
    // shippingStatus 非空默认 not_shipped；OR 中 null 分支会触发 Prisma 校验怪癖，勿加
    shippingStatus: { notIn: ["shipped", "delivered"] },
    ...baseScope,
  };
  const [pendingCount, shipPendingCount, confirmedCount, completedCount, cancelledCount] = await Promise.all([
    prisma.shopOrder.count({ where: pendingWhere }),
    prisma.shopOrder.count({ where: shipPendingWhere }),
    prisma.shopOrder.count({ where: { status: "confirmed", ...baseScope } }),
    prisma.shopOrder.count({ where: { status: "completed", ...baseScope } }),
    prisma.shopOrder.count({ where: { status: "cancelled", ...baseScope } }),
  ]);
  return NextResponse.json({
    ok: true,
    total,
    page,
    limit,
    items: items.map(mapOrder),
    viewer: {
      isAdmin: viewer.isAdmin,
      isSales: viewer.isSales,
      displayName: viewer.displayName,
    },
    stats: {
      pending: pendingCount,
      shipPending: shipPendingCount,
      confirmed: confirmedCount,
      completed: completedCount,
      cancelled: cancelledCount,
      totalAmount: sum === null ? 0 : Number(sum),
    },
  });
}
