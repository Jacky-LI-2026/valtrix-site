import { getActiveTemplateSlug, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";
import UnilokProductsPage from "@/components/theme-unilok/ProductsPage";
import KitzProductsPage from "@/components/theme-kitzsct/ProductsPage";
import ProductsDefaultClient from "./ProductsDefaultClient";
import { getPublicProductTabs } from "@/lib/api/public-product-tabs";
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
 * 默认版主体由基地原 <route>/page.tsx 原样拆出到 ./ProductsDefaultClient，
 * **品牌文案保持基地原样**（未采用阀门站版本）。
 * 模板判定统一走 lib/templates/get-active-template.ts（D4 唯一入口）。
 */
export default async function ProductsRoute() {
  const templateSlug = await getActiveTemplateSlug();
  // KITZ 洁净科技风模板（kitz-clean）→ 渲染 Kitz 版
  if (templateSlug === KITZ_CLEAN_SLUG) return <KitzProductsPage />;
  if (templateSlug === UNILOK_SLUG) return <UnilokProductsPage />;

  /**
   * 默认模板：**服务端先取一次真实产品树注入首屏**
   * ==========================================================================
   * 参数与客户端 `useProductTabs()` 完全一致（`specs=3&lite=1`）⇒ 形状逐字段相同：
   *   · SEO（owner 2026-10-12「如何让百度完整收录」）：SSR 的 HTML 里就有产品卡片与
   *     `/products/<tab>/<slug>` 内链 —— 百度这类几乎不执行 JS 的爬虫才看得见「产品中心」；
   *   · 体验：首屏不再等 XHR（骨架 → 直接出卡片），且数据是库里的真值（不会像静态树那样出死链）。
   * 取数失败不影响可用性：传空数组时组件回落到改造前的"骨架 → XHR 填充"行为。
   */
  let initialTabs: any[] = [];
  try {
    const ctx = await getTenantContext();
    initialTabs = await getPublicProductTabs({
      specsLimit: 3,
      lite: true,
      siteWhere: buildSiteWhere(ctx?.siteId ?? null),
    });
  } catch (e) {
    console.error("[products] 首屏产品树注入失败（回落到客户端取数）:", (e as Error)?.message);
  }

  return <ProductsDefaultClient initialTabs={initialTabs} />;
}
