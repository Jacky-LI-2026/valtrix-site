import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMemberToken, memberTokenFromRequest } from "@/lib/member-token";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

// GET /api/public/member/orders — 当前登录会员的订单列表（?orderNo=xxx 返回单条详情含物流）
export async function GET(req: NextRequest) {
  const tok = verifyMemberToken(memberTokenFromRequest(req));
  if (!tok?.mid) return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  const mid = BigInt(tok.mid);
  const orderNo = new URL(req.url).searchParams.get("orderNo")?.trim();

  if (orderNo) {
    const o = await prisma.shopOrder.findFirst({ where: { orderNo, memberId: mid } });
    if (!o) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      order: {
        orderNo: o.orderNo,
        status: o.status,
        statusLabel: STATUS_LABEL[o.status] || o.status,
        amount: Number(o.amount),
        currency: o.currency,
        payMethod: o.payMethod,
        items: o.items,
        remark: o.remark,
        shippingCompany: o.shippingCompany,
        trackingNo: o.trackingNo,
        shippedAt: o.shippedAt,
        shippingStatus: o.shippingStatus,
        deliveredAt: o.deliveredAt,
        history: o.history,
        createdAt: o.createdAt,
      },
    });
  }

  const orders = await prisma.shopOrder.findMany({
    where: { memberId: mid },
    orderBy: { id: "desc" },
    take: 50,
    select: {
      orderNo: true,
      status: true,
      amount: true,
      currency: true,
      items: true,
      createdAt: true,
      shippingCompany: true,
      trackingNo: true,
      shippedAt: true,
      shippingStatus: true,
    },
  });
  return NextResponse.json({
    ok: true,
    orders: orders.map((o: any) => ({
      orderNo: o.orderNo,
      status: o.status,
      statusLabel: STATUS_LABEL[o.status] || o.status,
      amount: Number(o.amount),
      currency: o.currency,
      itemsCount: Array.isArray(o.items) ? (o.items as any[]).reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0) : 0,
      shippingCompany: o.shippingCompany,
      trackingNo: o.trackingNo,
      shippedAt: o.shippedAt,
      shippingStatus: o.shippingStatus,
      createdAt: o.createdAt,
    })),
  });
}
