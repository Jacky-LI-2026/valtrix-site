/**
 * AI 内容推荐（ai-recommend 插件）
 * GET /api/public/recommendations?type=product|news&id=<slug>&limit=6&locale=zh
 * 协同过滤：看过当前内容的访客还看过哪些同类型内容；无行为数据时兜底返回同类型最新内容。
 * 插件关闭时返回 enabled:false（前台不渲染）。
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isPluginEnabled } from "@/lib/plugins/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEW_FILE = path.join(process.cwd(), "data", "views.jsonl");

function readViews(max: number): any[] {
  try {
    const raw = fs.readFileSync(VIEW_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    return lines.slice(-max).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const enabled = await isPluginEnabled("ai-recommend");
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") || "product";
    const targetId = String(sp.get("id") || "").trim();
    const locale = sp.get("locale") || "zh";
    const limit = Math.min(Number(sp.get("limit")) || 6, 10);

    // 插件关闭：不返回推荐（前台隐藏区块，也不收集）
    if (!enabled) return NextResponse.json({ ok: true, enabled: false, items: [] });

    const views = readViews(50000);

    // 1) 看过目标内容的访客
    const viewers = new Set<string>();
    for (const v of views) if (v.t === type && v.id === targetId && v.v && v.v !== "anon") viewers.add(v.v);

    // 2) 这些访客还看过什么（同类型，排除目标）
    const cooccur: Record<string, { count: number; href: string; lang: string; ts: number }> = {};
    const latestById: Record<string, { href: string; lang: string; ts: number }> = {};
    for (const v of views) {
      if (v.t !== type || v.id === targetId) continue;
      if (!latestById[v.id] || v.ts > latestById[v.id].ts) latestById[v.id] = { href: v.href || "", lang: v.lang || "", ts: v.ts || 0 };
      if (viewers.has(v.v)) {
        const cur = cooccur[v.id] || { count: 0, href: "", lang: "", ts: 0 };
        cur.count += 1;
        if (v.ts > cur.ts) { cur.href = v.href || ""; cur.lang = v.lang || ""; cur.ts = v.ts || 0; }
        cooccur[v.id] = cur;
      }
    }
    const ranked = Object.entries(cooccur).sort((a, b) => b[1].count - a[1].count || (b[1].ts - a[1].ts));

    const items: any[] = [];
    const model = type === "news" ? "news" : "product";
    const seen = new Set<string>();

    const fetchItem = async (id: string, href: string) => {
      try {
        const rec = await (prisma as any)[model].findUnique({ where: { slug: id } });
        if (!rec) return null;
        const name = rec["name"] || "";
        const nameEn = rec["nameEn"] || "";
        const nameJa = rec["nameJa"] || "";
        const nameKo = rec["nameKo"] || "";
        const nameFr = rec["nameFr"] || "";
        const nameAr = rec["nameAr"] || "";
        const pick: Record<string, string> = { zh: name, en: nameEn || name, ja: nameJa || name, ko: nameKo || name, fr: nameFr || name, ar: nameAr || name };
        const image = rec["image"] || rec["coverImage"] || "";
        return { id, name: pick[locale] || name, image, href: href || `/${type === "news" ? "news" : "products"}/${id}` };
      } catch { return null; }
    };

    for (const [id, info] of ranked) {
      if (seen.has(id)) continue;
      const it = await fetchItem(id, info.href);
      if (it) { seen.add(id); items.push(it); }
      if (items.length >= limit) break;
    }

    // 3) 兜底：同类型最新内容
    if (items.length < limit) {
      const fallback = await (prisma as any)[model].findMany({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: limit * 2,
      });
      for (const f of fallback) {
        if (seen.has(f["slug"]) || f["slug"] === targetId) continue;
        const it = await fetchItem(f["slug"], "");
        if (it) { seen.add(f["slug"]); items.push(it); }
        if (items.length >= limit) break;
      }
    }

    return NextResponse.json({ ok: true, enabled: true, type, items: items.slice(0, limit) });
  } catch (e: any) {
    console.error("推荐接口失败:", e);
    return NextResponse.json({ ok: true, enabled: true, items: [] });
  }
}
