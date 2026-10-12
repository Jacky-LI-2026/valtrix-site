import { getActiveTemplateSlug, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";
import UnilokNewsPage from "@/components/theme-unilok/NewsPage";
import KitzNewsPage from "@/components/theme-kitzsct/NewsPage";
import NewsDefaultClient from "./NewsDefaultClient";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

// 必须逐请求渲染：模板判定依赖请求头（x-preview-template / Host），
// 静态预渲染阶段拿不到请求头 → 会固定渲染默认模板。参见 AGENTS.md 同类坑。
export const dynamic = "force-dynamic";

// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致
const UNILOK_SLUG = "unilok-industrial";

/**
 * 模板派发（双 fork 合并 D3/D4，2026-09-12）
 * =====================================================
 * UNILOK 模板 → 渲染 Unilok 版；其余模板（含默认）→ 渲染默认版。
 * 默认版主体由基地原 <route>/page.tsx 原样拆出到 ./NewsDefaultClient，
 * **品牌文案保持基地原样**（未采用阀门站版本）。
 * 模板判定统一走 lib/templates/get-active-template.ts（D4 唯一入口）。
 */
export default async function NewsRoute() {
  const templateSlug = await getActiveTemplateSlug();
  // KITZ 洁净科技风模板（kitz-clean）→ 渲染 Kitz 版
  if (templateSlug === KITZ_CLEAN_SLUG) return <KitzNewsPage />;
  if (templateSlug === UNILOK_SLUG) return <UnilokNewsPage />;

  /**
   * 默认模板：**服务端先取一次新闻列表注入首屏**
   * ==========================================================================
   * 口径与 `/api/public/news?limit=50` 完全一致（同 where / orderBy / include / take，
   * 同样走 `serializeBigInt`）⇒ 首屏与客户端取数逐字段相同。
   *   · SEO（owner 2026-10-12「如何让百度完整收录」）：SSR 的 HTML 里直接有文章标题与
   *     `/news/<slug>` 内链 —— 百度这类几乎不执行 JS 的爬虫才看得见新闻列表页；
   *   · 体验：首屏不再等 XHR。
   * 取数失败传空数组 ⇒ 组件回落到改造前的"骨架 → XHR"行为。
   */
  let initialNews: any[] = [];
  try {
    const ctx = await getTenantContext();
    const siteWhere = buildSiteWhere(ctx?.siteId ?? null);
    const rows = await prisma.news.findMany({
      where: { AND: [{ status: "published" }, siteWhere] },
      orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }],
      take: 50,
      /**
       * 只取**列表渲染真正用到的字段**（不 select `content*` —— 六语种正文是全篇富文本，
       * 列表页一个字都不渲染，白占 SSR 载荷：左文站实测 /news 的 HTML 因此从 204KB 降到 ~40KB）。
       * 客户端挂载后仍会用 `/api/public/news?limit=50`（含正文）刷新一次，行为与改造前一致。
       * ⚠️ `NewsCategory` 只有 name / nameEn / slug（**没有** nameJa/Ko/Fr/Ar）——
       *    多选一个不存在的字段 Prisma 会直接抛错（历史上踩过）。
       */
      select: {
        id: true,
        slug: true,
        title: true, titleEn: true, titleJa: true, titleKo: true, titleFr: true, titleAr: true,
        summary: true, summaryEn: true, summaryJa: true, summaryKo: true, summaryFr: true, summaryAr: true,
        coverImage: true,
        isFeatured: true,
        isTop: true,
        publishedAt: true,
        category: { select: { id: true, name: true, nameEn: true, slug: true } },
      },
    });
    initialNews = serializeBigInt(rows) as any[];
  } catch (e) {
    console.error("[news] 首屏新闻列表注入失败（回落到客户端取数）:", (e as Error)?.message);
  }

  return <NewsDefaultClient initialNews={initialNews} />;
}
