import { headers } from "next/headers";
import { getTemplatePreset, DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";
import { prisma } from "@/lib/prisma";
import UnilokProductsPage from "@/components/theme-unilok/ProductsPage";
import KitzProductsPage from "@/components/theme-kitzsct/ProductsPage";
import ProductsDefaultClient from "./ProductsDefaultClient";

// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致（服务端不可依赖 "use client" 模块）
const UNILOK_SLUG = "unilok-industrial";
// 与 lib/templates/active-theme.ts 的 KITZ_CLEAN_SLUG 保持一致
const KITZ_SLUG = "kitz-clean";

/**
 * 服务端读取当前活动模板 slug（与 app/products/[tab]/[id]/page.tsx 一致）：
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

export default async function ProductsPage() {
  const templateSlug = await getTemplateSlugServer();
  const isUnilok = templateSlug === UNILOK_SLUG;
  const isKitz = templateSlug === KITZ_SLUG;
  return isKitz ? <KitzProductsPage /> : isUnilok ? <UnilokProductsPage /> : <ProductsDefaultClient />;
}
