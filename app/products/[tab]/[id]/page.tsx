import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";
import UnilokProductDetailPage from "@/components/theme-unilok/ProductDetailPage";
import KitzProductDetailPage from "@/components/theme-kitzsct/ProductDetailPage";
import { headers } from "next/headers";
import { getTemplatePreset, DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";
import { productSchema, breadcrumbSchema, renderJsonLd } from "@/lib/seo/schema";
import { getSiteBaseUrl } from "@/lib/site-url";

// 域名取自部署级环境变量（勿硬编码，双 fork 合并 D1=单码多库）
const BASE_URL = getSiteBaseUrl();
// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致（服务端不可依赖 "use client" 模块）
const UNILOK_SLUG = "unilok-industrial";
// 与 lib/templates/active-theme.ts 的 KITZ_CLEAN_SLUG 保持一致
const KITZ_SLUG = "kitz-clean";

/**
 * 服务端读取当前活动模板 slug（与 layout.tsx getTheme 逻辑一致）：
 * 模板预览 header 优先 → 租户上下文 → themeConfig 表 → 默认
 */
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
  try {
    const slug = decodeURIComponent(props.params.id);
    const record = await (prisma as any)["product"].findUnique({ where: { slug: slug } });
    if (!record) {
      return { title: decodeURIComponent(props.params.id) };
    }
    return buildSeoMetadata({
      record,
      fallbackTitle: record["nameEn"] || record["name"] || "",
      fallbackDescription: record["summaryEn"] || record["summary"] || "",
    });
  } catch (e) {
    console.error("app/products/[tab]/[id]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
}

export default async function Page(props: Props) {
  const templateSlug = await getTemplateSlugServer();
  const isUnilok = templateSlug === UNILOK_SLUG;
  const isKitz = templateSlug === KITZ_SLUG;
  let jsonLd = "";
  try {
    const slug = decodeURIComponent(props.params.id);
    const record = await (prisma as any)["product"].findUnique({ where: { slug: slug } });
    if (record) {
      const path = `/products/${props.params.tab}/${slug}`;
      const name = record["name"] || record["model"] || slug;
      jsonLd = renderJsonLd([
        breadcrumbSchema([
          { name: "首页", path: "/" },
          { name: "产品中心", path: "/products" },
          { name, path },
        ]),
        productSchema({
          name,
          description: record["summary"] || "",
          image: record["image"] || null,
          url: `${BASE_URL}${path}`,
          sku: record["model"] || slug,
          brand: "VALTRIX",
          priceMin: record["priceMin"] != null ? Number(record["priceMin"]) : null,
          priceMax: record["priceMax"] != null ? Number(record["priceMax"]) : null,
          priceUnit: record["priceUnit"] || null,
        }),
      ]);
    }
  } catch (e) {
    console.error("product JSON-LD 生成失败:", (e as Error).message);
  }
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {isKitz ? <KitzProductDetailPage /> : isUnilok ? <UnilokProductDetailPage /> : <ProductDetailClient />}
    </>
  );
}
