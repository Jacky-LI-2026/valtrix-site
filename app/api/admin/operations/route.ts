/**
 * 运营驾驶舱 · 聚合数据 API
 * GET /api/admin/operations → 各商机渠道的 KPI + 趋势 + 分布
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function bucket(list: { createdAt: Date | string }[], days: number) {
  const arr = new Array(days).fill(0);
  const now = Date.now();
  for (const it of list) {
    const t = new Date(it.createdAt).getTime();
    const idx = Math.floor((now - t) / DAY);
    if (idx >= 0 && idx < days) arr[idx]++;
  }
  return arr.reverse();
}

function readJsonl(file: string): any[] {
  try {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 7), 90);

  // 各渠道数据
  const [quotes, visits, forms, subs, leads] = await Promise.all([
    prisma.quoteRequest.findMany({ select: { id: true, createdAt: true, country: true, status: true } }),
    prisma.visitBooking.findMany({ select: { id: true, createdAt: true, country: true } }).catch(() => []),
    prisma.formDefinition.findMany({ select: { id: true, name: true, submitCount: true } }),
    prisma.formSubmission.findMany({ select: { id: true, createdAt: true, country: true } }).catch(() => []),
    Promise.resolve(readJsonl("data/download-leads.jsonl")),
  ]);

  const manualLeads = readJsonl("data/leads.jsonl").map((l: any) => ({ createdAt: l.createdAt || new Date().toISOString(), country: l.country }));

  // KPI
  const todayStart = daysAgo(0);
  const allChannels: { createdAt: Date; country?: string | null; type: string }[] = [
    ...quotes.map((q) => ({ ...q, type: "询价" })),
    ...visits.map((v) => ({ ...v, type: "考察预约" })),
    ...subs.map((s) => ({ ...s, type: "表单提交" })),
    ...leads.map((l) => ({ createdAt: new Date(l.createdAt || Date.now()), country: l.country, type: "下载留资" })),
    ...manualLeads.map((l) => ({ createdAt: new Date(l.createdAt), country: l.country, type: "留言" })),
  ];

  const todayCount = allChannels.filter((c) => new Date(c.createdAt) >= todayStart).length;
  const weekCount = allChannels.filter((c) => new Date(c.createdAt) >= daysAgo(7)).length;

  const trend = bucket(allChannels, days);
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * DAY);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // 渠道分布
  const byType: Record<string, number> = {};
  for (const c of allChannels) byType[c.type] = (byType[c.type] || 0) + 1;

  // 国家分布
  const byCountry: Record<string, number> = {};
  for (const c of allChannels) {
    if (c.country) byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  }

  // 询价状态
  const quoteStatus: Record<string, number> = {};
  for (const q of quotes) quoteStatus[q.status] = (quoteStatus[q.status] || 0) + 1;

  // 表单 TOP
  const topForms = subs.length || forms.length
    ? [...forms].map((f) => ({ name: f.name, count: Number(f.submitCount) })).sort((a, b) => b.count - a.count).slice(0, 5)
    : [];

  return NextResponse.json({
    kpi: { today: todayCount, week: weekCount, total: allChannels.length, forms: forms.length },
    trend: { dates, values: trend },
    byType,
    byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8),
    quoteStatus,
    topForms,
    days,
  });
}
