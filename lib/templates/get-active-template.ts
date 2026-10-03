/**
 * 服务端获取当前活动模板 slug（首页条件渲染入口）
 * =====================================================
 * 与 app/layout.tsx 的 getTheme() 保持同源判定逻辑，保证
 * <html data-template="xxx"> 与 app/page.tsx 的渲染分支一致：
 *   1) 模板预览覆盖：?__template=xxx → middleware 转 x-preview-template header（仅本次请求）
 *   2) 租户站点级 templateSlug（site.themeConfig 含主题色时生效）
 *   3) 全局 theme_config.templateSlug
 *   4) 回退默认模板
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D4：
 *      本文件为全站唯一模板判定入口，app/layout.tsx 与前台页面均应复用其结论）。
 */
import { prisma } from "@/lib/prisma";
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
  //    与 app/layout.tsx 保持同一写法：**动态 import + 同步调用**。
  //    顶层 import next/headers 会让本模块被判定进客户端图而报
  //    "next/headers ... not supported in the pages/ directory"，此处刻意避开。
  try {
    const { headers } = await import("next/headers");
    const previewTpl = headers().get("x-preview-template");
    if (previewTpl) return previewTpl;
  } catch (e) {
    console.error("[getActiveTemplateSlug] 读取 x-preview-template 失败:", (e as Error)?.message);
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
