/**
 * 服务端获取当前活动模板 slug（首页条件渲染入口）
 * =====================================================
 * 与 app/layout.tsx 的 getTheme() 保持同源判定逻辑，保证
 * <html data-template="xxx"> 与 app/page.tsx 的渲染分支一致：
 *   1) 模板预览覆盖：?__template=xxx → middleware 转 x-preview-template header（仅本次请求）
 *   2) 租户站点级 templateSlug（site.themeConfig 含主题色时生效）
 *   3) 全局 theme_config.templateSlug
 *   4) 回退默认模板
 */
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";

/** UNILOK 精密工业风模板 slug（与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致） */
export const UNILOK_INDUSTRIAL_SLUG = "unilok-industrial";

/** KITZ 洁净科技风模板 slug（与 lib/templates/active-theme.ts 的 KITZ_CLEAN_SLUG 保持一致） */
export const KITZ_CLEAN_SLUG = "kitz-clean";

/**
 * 服务端获取当前活动模板 slug。
 * 注意：仅限 Server Component / Route Handler 调用（内部使用 next/headers + prisma）。
 */
export async function getActiveTemplateSlug(): Promise<string> {
  // 1) 模板预览覆盖（后台模板 Demo 页 ?__template=xxx，middleware 转发为 header）
  try {
    const h = await headers();
    const previewTpl = h.get("x-preview-template");
    if (previewTpl) return previewTpl;
  } catch {
    /* headers 不可用时忽略 */
  }

  // 2) 租户站点级模板（与 layout getTheme 同判定：站点 themeConfig 含主题色才生效）
  try {
    const { getTenantContext } = await import("@/lib/tenant/context");
    const ctx = await getTenantContext();
    if (ctx?.themeConfig && typeof ctx.themeConfig === "object") {
      const tc: any = ctx.themeConfig;
      if (tc.primary || tc.primaryLight || tc.accent) {
        return ctx.templateSlug || DEFAULT_TEMPLATE_SLUG;
      }
    }
  } catch {
    /* 站点上下文不可用时回退全局 */
  }

  // 3) 全局 theme_config.templateSlug
  try {
    const config = await prisma.themeConfig.findFirst({
      orderBy: { id: "asc" },
      select: { templateSlug: true },
    });
    if (config?.templateSlug) return config.templateSlug;
  } catch {
    /* 数据库不可用时使用默认值 */
  }

  return DEFAULT_TEMPLATE_SLUG;
}
