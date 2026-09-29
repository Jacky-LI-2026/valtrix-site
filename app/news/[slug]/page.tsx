import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsDetailClient from "./NewsDetailClient";
import NewsDefaultClient from "../NewsDefaultClient";
import UnilokNewsDetailPage from "@/components/theme-unilok/NewsDetailPage";
import KitzNewsDetailPage from "@/components/theme-kitzsct/NewsDetailPage";
import { articleSchema, breadcrumbSchema, renderJsonLd } from "@/lib/seo/schema";
import { headers } from "next/headers";
import { getTemplatePreset, DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";
import { getSiteBaseUrl } from "@/lib/site-url";

// 域名取自部署级环境变量（勿硬编码，双 fork 合并 D1=单码多库）
const BASE_URL = getSiteBaseUrl();
// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致
const UNILOK_SLUG = "unilok-industrial";
// 与 lib/templates/active-theme.ts 的 KITZ_CLEAN_SLUG 保持一致
const KITZ_SLUG = "kitz-clean";

/** 服务端读取当前活动模板 slug */
async function getTemplateSlugServer(): Promise<string> {
  try {
    const h = headers();
    const previewTpl = h.get("x-preview-template");
    if (previewTpl) return getTemplatePreset(previewTpl).slug;
    const { getTenantContext } = await import("@/lib/tenant/context");
    const ctx = await getTenantContext(h);
    if (ctx?.themeConfig && typeof ctx.themeConfig === "object") {
      const tc: any = ctx.themeConfig;
      if (tc.primary || tc.primaryLight || tc.accent) {
        return ctx.templateSlug || DEFAULT_TEMPLATE_SLUG;
      }
    }
    const config = await prisma.themeConfig.findFirst({
      orderBy: { id: "asc" },
    });
    return config?.templateSlug || DEFAULT_TEMPLATE_SLUG;
  } catch {
    return DEFAULT_TEMPLATE_SLUG;
  }
}

interface Props {
  params: Record<string, string>;
}

/**
 * `/news/<段>` 的**分类兜底**（owner 2026-09-29：「解决这类链接报 404 的问题」，例：`/news/Company-News`）
 * ==========================================================================
 * 背景：站点菜单/行业包里存在 `/news/<分类 slug>` 这类链接，但 `/news/[slug]` 此前只按
 *   **文章 slug** 查库 ⇒ 命中不到就直接 404。
 * 口径：先当文章查（既有行为不变）；查不到再当**分类**查（大小写不敏感），
 *   命中则以「新闻列表 + 该分类预筛选」渲染，仍查不到才 404。
 * 返回：{ slug, id, name } 或 null。
 */
async function findNewsCategory(rawSlug: string): Promise<{ slug: string; id: bigint; name: string } | null> {
  const slug = decodeURIComponent(rawSlug || "");
  if (!slug) return null;
  /**
   * 兼容别名：行业包/菜单里写的是英文段，而库里分类 slug/名称可能是中文
   * ⇒ 直接匹配命中不到。这里做一次「英文段 → 中文分类关键词」的兜底匹配。
   */
  const ALIAS: Record<string, string> = {
    "company-news": "公司",
    "industry-news": "行业",
    "product-news": "产品",
    "tech-news": "技术",
  };
  const aliasKey = slug.toLowerCase().replace(/[\s_]+/g, "-");
  try {
    const row: any = await (prisma as any)["newsCategory"].findFirst({
      where: { slug: { equals: slug, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
    });
    if (row) return { slug: String(row.slug), id: row.id, name: String(row.name || row.slug) };
    // 再兜一层：分类名与段一致时也认（后台把 slug 写成中文/异形时仍可用）
    const byName: any = await (prisma as any)["newsCategory"].findFirst({
      where: { name: { equals: slug, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
    });
    if (byName) return { slug: String(byName.slug), id: byName.id, name: String(byName.name || byName.slug) };
    const kw = ALIAS[aliasKey];
    if (kw) {
      const byAlias: any = await (prisma as any)["newsCategory"].findFirst({
        where: { OR: [{ name: { contains: kw } }, { slug: { contains: kw } }] },
        orderBy: { id: "asc" },
        select: { id: true, slug: true, name: true },
      });
      if (byAlias) return { slug: String(byAlias.slug), id: byAlias.id, name: String(byAlias.name || byAlias.slug) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let record: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    record = await (prisma as any)["news"].findUnique({ where: { slug: slug } });
  } catch (e) {
    console.error("app/news/[slug]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
  // 🔴 记录不存在 ⇒ notFound()（HTTP 404）。此前是 `return { title: slug }` ⇒ HTTP 200 = soft-404。
  //    ⚠️ 必须在 try 之外：notFound() 靠抛特殊异常工作，放在 try 里会被上面的 catch 吞掉。
  if (!record) {
    // 不是文章 ⇒ 可能是"分类列表页"（/news/Company-News）
    const cat = await findNewsCategory(props.params.slug);
    if (!cat) notFound();
    return { title: cat.name } as Metadata;
  }
  return buildSeoMetadata({
    record,
    fallbackTitle: record["titleEn"] || record["title"] || "",
    fallbackDescription: record["summaryEn"] || record["summary"] || "",
  });
}

export default async function Page(props: Props) {
  const templateSlug = await getTemplateSlugServer();
  const isUnilok = templateSlug === UNILOK_SLUG;
  const isKitz = templateSlug === KITZ_SLUG;

  // 记录不存在（含未发布）⇒ 404；查询异常保持原有容错（不当作 404）
  let exists: any = null;
  try {
    const slug = decodeURIComponent(props.params.slug);
    exists = await (prisma as any)["news"].findUnique({
      where: { slug: slug },
      select: { id: true, status: true },
    });
  } catch (e) {
    exists = { id: -1, status: "published" };
  }
  if (!exists || exists.status !== "published") {
    // 同上：分类兜底 → 渲染新闻列表并预置该分类筛选
    const cat = await findNewsCategory(props.params.slug);
    if (!cat) notFound();
    // 分类列表统一走默认列表组件（带分类预筛选）——非默认模板也只影响样式，不影响"链接可用"
    return <NewsDefaultClient initialCategorySlug={cat.slug} />;
  }

  let jsonLd = "";
  try {
    const slug = decodeURIComponent(props.params.slug);
    const record = await (prisma as any)["news"].findUnique({ where: { slug: slug } });
    if (record) {
      const path = `/news/${slug}`;
      const title = record["title"] || slug;
      jsonLd = renderJsonLd([
        breadcrumbSchema([
          { name: "首页", path: "/" },
          { name: "新闻动态", path: "/news" },
          { name: title, path },
        ]),
        articleSchema({
          title,
          description: record["summary"] || "",
          image: record["coverImage"] || record["image"] || null,
          url: `${BASE_URL}${path}`,
          datePublished: record["publishedAt"] || record["createdAt"] || null,
          dateModified: record["updatedAt"] || null,
          author: "VALTRIX",
        }),
      ]);
    }
  } catch (e) {
    console.error("news JSON-LD 生成失败:", (e as Error).message);
  }
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {isKitz ? (
        <KitzNewsDetailPage params={props.params as any} />
      ) : isUnilok ? (
        <UnilokNewsDetailPage params={props.params as any} />
      ) : (
        <NewsDetailClient params={props.params as any} />
      )}
    </>
  );
}
