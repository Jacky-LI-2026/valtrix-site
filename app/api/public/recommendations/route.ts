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
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

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

    /**
     * 多租户过滤（与 `/api/public/products`、`/api/public/news` 同一口径）：
     * 此前推荐接口的查询**完全没有站点范围** ⇒ 兜底查询会把"不在本站范围的内容"也捞进来。
     * 阀门站实测：兜底把 `ZW-10D-15D-MFC`（owner 手工放进阀门站、siteId=null 全局共享）
     * 推到了阀门站前台 —— 该行本身合法，但接口无视站点范围这件事必须收口。
     */
    const ctx = await getTenantContext(req.headers);
    const siteWhere = buildSiteWhere(ctx.siteId);

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

    // 字段名按模型区分（坑：News 没有 name/nameEn…，标题字段是 title/titleEn…；
    // 之前统一按 product 的字段读 ⇒ 新闻推荐卡片标题全为空字符串，前台只剩图片）
    const titleFields =
      model === "news"
        ? { zh: "title", en: "titleEn", ja: "titleJa", ko: "titleKo", fr: "titleFr", ar: "titleAr" }
        : { zh: "name", en: "nameEn", ja: "nameJa", ko: "nameKo", fr: "nameFr", ar: "nameAr" };

    const fetchItem = async (id: string, href: string) => {
      try {
        // 新闻顺带取分类 + 摘要 + 日期：前台「猜你喜欢」要与「相关新闻」用同一套卡片版式
        // 产品顺带取 tab：拼链接必须带分类段，否则 `/products/<型号>` 是 404 死链
        // （用 findFirst 而非 findUnique —— 需要在 where 里附加非唯一条件 siteWhere）
        const rec = await (prisma as any)[model].findFirst(
          model === "news"
            ? {
                where: { slug: id, ...siteWhere },
                include: {
                  // ⚠️ NewsCategory 只有 name / nameEn（没有 nameJa/Ko/Fr/Ar）——
                  //    多选一个不存在的字段 Prisma 会直接抛错，被 catch 吞掉后推荐位全空（本次踩过）。
                  category: {
                    select: { name: true, nameEn: true },
                  },
                },
              }
            : {
                // 产品：前台不显示的（visible=false）不当推荐项
                where: { slug: id, visible: true, ...siteWhere },
                include: { tab: { select: { slug: true } } },
              }
        );
        if (!rec) return null;
        const base: string = rec[titleFields.zh] || "";
        const pick: Record<string, string> = {
          zh: base,
          en: rec[titleFields.en] || base,
          ja: rec[titleFields.ja] || base,
          ko: rec[titleFields.ko] || base,
          fr: rec[titleFields.fr] || base,
          ar: rec[titleFields.ar] || base,
        };
        const image = rec["image"] || rec["coverImage"] || "";
        const title = pick[locale] || base;
        // 标题仍为空 ⇒ 视为无效推荐项，交给调用方跳过（避免出现「只有图没有字」的卡片）
        if (!title) return null;
        /** 链接：新闻 `/news/<slug>`；产品**必须**带分类段 `/products/<tab>/<slug>` */
        const tabSlug = String(rec?.tab?.slug || "").trim();
        // 片段一律 encodeURIComponent：阀门站的 tab slug 实测含空格（"Integrated System"）
        const defaultHref =
          model === "news"
            ? `/news/${encodeURIComponent(id)}`
            : tabSlug
              ? `/products/${encodeURIComponent(tabSlug)}/${encodeURIComponent(id)}`
              : "";
        // 产品拿不到 tab 段 ⇒ 拼不出可用链接，宁可不出这一项，也不给死链
        if (!href && !defaultHref) return null;
        const item: Record<string, any> = {
          id,
          name: title,
          image,
          href: href || defaultHref,
        };
        if (model === "news") {
          const cat = rec["category"];
          if (cat) {
            const catPick: Record<string, string> = {
              zh: cat.name || "",
              en: cat.nameEn || cat.name || "",
              ja: cat.nameEn || cat.name || "",
              ko: cat.nameEn || cat.name || "",
              fr: cat.nameEn || cat.name || "",
              ar: cat.nameEn || cat.name || "",
            };
            item.categoryName = catPick[locale] || cat.name || "";
          }
          const summaryPick: Record<string, string> = {
            zh: rec.summary || "",
            en: rec.summaryEn || rec.summary || "",
            ja: rec.summaryJa || rec.summary || "",
            ko: rec.summaryKo || rec.summary || "",
            fr: rec.summaryFr || rec.summary || "",
            ar: rec.summaryAr || rec.summary || "",
          };
          item.summary = summaryPick[locale] || rec.summary || "";
          const published = rec.publishedAt || rec.createdAt || null;
          item.date = published ? new Date(published).toISOString() : "";
        }
        return item;
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
        // 产品多一个「前台显示」条件；新闻/其它模型没有该列（加了会直接抛错）
        where: { status: "published", ...(model === "product" ? { visible: true } : {}), ...siteWhere },
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
