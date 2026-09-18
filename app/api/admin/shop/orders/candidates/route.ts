import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getSalesViewer, orderProductIds } from "@/lib/server/sales-user";

export const dynamic = "force-dynamic";

// GET /api/admin/shop/orders/candidates?orderId=xxx — 订单可分配的销售候选（管理员用）
// 返回全部启用销售，并标注是否绑定了该订单内产品（绑定者优先显示）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const viewer = await getSalesViewer(session?.user);
  if (!viewer.isAdmin) return NextResponse.json({ ok: false, error: "仅管理员可查看" }, { status: 403 });

  const orderId = new URL(req.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ ok: false, error: "缺少订单号" }, { status: 400 });

  const o = await prisma.shopOrder.findUnique({ where: { id: BigInt(orderId) }, select: { items: true, salesUserId: true } });
  if (!o) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });

  const productIds = orderProductIds(o.items);
  const sales = await prisma.user.findMany({
    where: { isSales: true, status: "active" },
    orderBy: [{ salesOrder: "asc" }, { id: "asc" }],
    include: { salesProducts: { select: { id: true } } },
  });

  const items = sales.map((s) => {
    const boundIds = s.salesProducts.map((p: any) => p.id);
    const matched = boundIds.filter((pid: bigint) => productIds.includes(pid));
    return {
      id: s.id.toString(),
      username: s.username,
      displayName: s.displayName,
      email: s.email,
      salesOrder: s.salesOrder,
      bound: matched.length > 0, // 是否绑定该订单产品
      boundNames: matched.length,
      current: o.salesUserId ? String(o.salesUserId) === s.id.toString() : false,
    };
  });

  return NextResponse.json({ ok: true, items });
}
