import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const s = typeof v.toString === "function" ? v.toString() : String(v);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// GET /api/admin/shop/stats — 销售统计（销售额/订单量/30天趋势/商品排行；cancelled 不计入）
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyAgo = new Date(todayStart.getTime() - 29 * 86400000);

  const [orders, totalCount, productCount] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { status: { not: "cancelled" } },
      select: { amount: true, status: true, createdAt: true, items: true },
    }),
    prisma.shopOrder.count(),
    prisma.shopProduct.count(),
  ]);

  const active = orders.filter((o) => o.status !== "cancelled");
  const sum = (list: typeof active) => list.reduce((s, o) => s + (toNum(o.amount) - toNum((o as any).discountAmount)), 0);

  const today = active.filter((o) => o.createdAt >= todayStart);
  const yesterday = active.filter((o) => o.createdAt >= yesterdayStart && o.createdAt < todayStart);
  const week = active.filter((o) => o.createdAt >= weekStart);
  const month = active.filter((o) => o.createdAt >= monthStart);

  const fmtStat = (list: typeof active) => ({
    sales: Math.round(sum(list) * 100) / 100,
    orders: list.length,
    avg: list.length ? Math.round((sum(list) / list.length) * 100) / 100 : 0,
  });

  // 近 30 天每日趋势（补零）
  const daily: { date: string; sales: number; orders: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d0 = new Date(thirtyAgo.getTime() + i * 86400000);
    const d1 = new Date(d0.getTime() + 86400000);
    const dayList = active.filter((o) => o.createdAt >= d0 && o.createdAt < d1);
    daily.push({
      date: `${d0.getMonth() + 1}/${d0.getDate()}`,
      sales: Math.round(sum(dayList) * 100) / 100,
      orders: dayList.length,
    });
  }

  // 商品销售排行 top10（按 items 聚合；排除 cancelled）
  const rankMap = new Map<string, { name: string; qty: number; sales: number }>();
  for (const o of active) {
    for (const it of (o.items as any[]) || []) {
      const slug = String(it.slug || it.id || "");
      const name = String(it.name || it.nameEn || slug);
      const qty = Number(it.qty) || 0;
      const price = it.price === null || it.price === undefined ? 0 : Number(it.price);
      const cur = rankMap.get(slug) || { name, qty: 0, sales: 0 };
      cur.qty += qty;
      cur.sales += price * qty;
      rankMap.set(slug, cur);
    }
  }
  const rank = Array.from(rankMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10)
    .map((r, i) => ({ rank: i + 1, ...r, sales: Math.round(r.sales * 100) / 100 }));

  return NextResponse.json({
    ok: true,
    stats: {
      today: fmtStat(today),
      yesterday: fmtStat(yesterday),
      week: fmtStat(week),
      month: fmtStat(month),
      totalOrders: totalCount,
      productCount,
    },
    daily,
    rank,
  });
}
