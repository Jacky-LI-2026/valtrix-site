import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import {
  scoreVisitor,
  isDetailPath,
  isHighValueEvent,
  keyBehaviors,
  type VisitorAgg,
} from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

/** 时间范围起始 */
function rangeStart(range: string): Date {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
  return new Date(Date.now() - days * 86400000);
}

/**
 * GET /api/admin/funnel
 *  ?range=7d|30d|90d  → 销售漏斗统计
 *  ?view=leads        → 线索评分列表（按意向分排序）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30d";
  const start = rangeStart(range);

  try {
    if (searchParams.get("view") === "leads") {
      return await leadScoreList(start);
    }
    return await funnelStats(start);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** 漏斗统计 */
async function funnelStats(start: Date) {
  const rangeWhere = { gte: start };

  // 各阶段数量
  const [visits, visitors, deepVisitors, interactions, leads, won] = await Promise.all([
    prisma.analyticsPageView.count({ where: { enteredAt: rangeWhere } }),
    prisma.analyticsVisitor.count({ where: { createdAt: rangeWhere } }),
    // 深度访客：浏览 ≥2 页
    (async () => {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "visitorId" FROM "analytics_page_views"
        WHERE "enteredAt" >= ${start}
        GROUP BY "visitorId" HAVING COUNT(*) >= 2`;
      return rows.length;
    })(),
    // 高价值互动（下载/询价/留言等事件，按类型/标签过滤）
    (async () => {
      const evts = await prisma.analyticsEvent.findMany({
        where: { createdAt: rangeWhere },
        select: { type: true, action: true, label: true },
      });
      return evts.filter((e) => isHighValueEvent(e.type, e.action, e.label)).length;
    })(),
    // 商机：留言 + 报价询价
    (async () => {
      const [cm, qr] = await Promise.all([
        prisma.contactMessage.count({ where: { createdAt: rangeWhere } }),
        prisma.quoteRequest.count({ where: { createdAt: rangeWhere } }).catch(() => 0),
      ]);
      return cm + qr;
    })(),
    // 成交：状态为 deal 的商机
    (async () => {
      const [cm, qr] = await Promise.all([
        prisma.contactMessage.count({ where: { createdAt: rangeWhere, status: "deal" } }),
        prisma.quoteRequest.count({ where: { createdAt: rangeWhere, status: "deal" } }).catch(() => 0),
      ]);
      return cm + qr;
    })(),
  ]);

  const stages = [
    { key: "visit", name: "页面访问", value: visits },
    { key: "visitor", name: "访客数", value: visitors },
    { key: "deep", name: "深度访客", value: deepVisitors },
    { key: "interaction", name: "高价值互动", value: interactions },
    { key: "lead", name: "商机留资", value: leads },
    { key: "won", name: "成交", value: won },
  ];
  // 转化率：相邻两层
  const rates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i].value;
    const rate = from > 0 ? Math.round((stages[i + 1].value / from) * 1000) / 10 : 0;
    rates.push({ from: stages[i].key, to: stages[i + 1].key, rate });
  }
  return NextResponse.json(serializeBigInt({ range: "7d/30d/90d", stages, rates }));
}

/** 线索评分列表：访客聚合 → 意向分排序 */
async function leadScoreList(start: Date) {
  const pageSize = 50;
  const visitors = await prisma.analyticsVisitor.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { lastSeenAt: "desc" },
    take: 500,
  });

  const aggs: VisitorAgg[] = await Promise.all(
    visitors.map(async (v) => {
      const pageViews = await prisma.analyticsPageView.count({ where: { visitorId: v.id } });
      const detailViews = await prisma.analyticsPageView
        .findMany({ where: { visitorId: v.id }, select: { path: true } })
        .then((rows) => rows.filter((r) => isDetailPath(String(r.path))).length)
        .catch(() => 0);
      const events = await prisma.analyticsEvent.findMany({
        where: { visitorId: v.id },
        select: { type: true, action: true, label: true },
      });
      const interactions = events.filter((e) =>
        isHighValueEvent(e.type, e.action, e.label)
      ).length;
      // OneID：按 visitorKey 关联留资（留言/询价/下载/考察预约）
      const [msgCount, quoteCount, bookCount] = await Promise.all([
        prisma.contactMessage.count({ where: { visitorKey: v.visitorKey } }).catch(() => 0),
        prisma.quoteRequest.count({ where: { visitorKey: v.visitorKey } }).catch(() => 0),
        prisma.visitBooking.count({ where: { visitorKey: v.visitorKey } }).catch(() => 0),
      ]);
      const opportunities = msgCount + quoteCount + bookCount;
      const durationSeconds = Math.round((v.totalDuration || 0) / 1000);
      return {
        visitorKey: v.visitorKey,
        ip: v.ip,
        country: v.country,
        region: v.region,
        city: v.city,
        deviceType: v.deviceType,
        browser: v.browser,
        os: v.os,
        lastSeenAt: v.lastSeenAt,
        totalDuration: v.totalDuration,
        pageViews,
        detailViews,
        interactions,
        opportunities,
        durationSeconds,
      };
    })
  );

  const scored = aggs
    .map((a) => {
      const s = scoreVisitor(a);
      return { ...a, ...s, behaviors: keyBehaviors(a) };
    })
    .sort((a, b) => b.score - a.score || Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0))
    .slice(0, pageSize);

  const high = scored.filter((x) => x.level === "high").length;
  const medium = scored.filter((x) => x.level === "medium").length;
  const low = scored.filter((x) => x.level === "low").length;

  return NextResponse.json(serializeBigInt({ leads: scored, summary: { high, medium, low, total: scored.length } }));
}
