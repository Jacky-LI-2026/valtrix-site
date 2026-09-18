import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsDetailClient from "./NewsDetailClient";
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
  if (!record) notFound();
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
  if (!exists || exists.status !== "published") notFound();

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
