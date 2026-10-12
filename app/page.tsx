import Hero from "@/components/sections/Hero";
import Products from "@/components/sections/Products";
import Features from "@/components/sections/Features";
import Stats from "@/components/sections/Stats";
import About from "@/components/sections/About";
import Industries from "@/components/sections/Industries";
import CaseShowcase from "@/components/sections/CaseShowcase";
import Services from "@/components/sections/Services";
import CTA from "@/components/sections/CTA";
import { getHomeSectionConfig } from "@/lib/home-sections";
import UnilokHome from "@/components/theme-unilok/UnilokHome";
import KitzHome from "@/components/theme-kitzsct/KitzHome";
import { getActiveTemplateSlug, UNILOK_INDUSTRIAL_SLUG, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";
import { getPublicProductTabs } from "@/lib/api/public-product-tabs";
import { buildHomeProductLists } from "@/lib/products-flat";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

// 模板判定依赖请求头（Host / ?__template=），静态预渲染会拿不到 → 必须逐请求渲染
export const dynamic = "force-dynamic";

const SECTION_MAP: Record<string, any> = {
  hero: Hero,
  products: Products,
  features: Features,
  stats: Stats,
  about: About,
  industries: Industries,
  cases: CaseShowcase,
  services: Services,
  cta: CTA,
};

export default async function HomePage() {
  // UNILOK 精密工业风模板：整页替换（双 fork 合并 D3）
  const templateSlug = await getActiveTemplateSlug();
  if (templateSlug === UNILOK_INDUSTRIAL_SLUG) {
    return <UnilokHome />;
  }

  // KITZ 洁净科技风模板（kitz-clean）：整页替换
  if (templateSlug === KITZ_CLEAN_SLUG) {
    return <KitzHome />;
  }

  // 前台组件市场：按后台配置启停/排序渲染（默认全部显示）
  let order: string[] = [];
  try {
    const cfg = await getHomeSectionConfig();
    order = cfg.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.key);
  } catch {
    order = ["hero", "products", "features", "stats", "about", "industries", "cases", "services", "cta"];
  }

  /**
   * 首页产品区块的**首屏数据**（服务端先取一次）
   * ==========================================================================
   * 为什么：`components/sections/Products.tsx` 是客户端组件、自己 fetch ——
   *   首页 HTML 里因此**一条 `/products/...` 内链都没有**（实测 0 处），
   *   而首页是全站权重最高、也是爬虫最主要的入口页（owner 2026-10-12「如何让百度完整收录」）。
   * 口径：`specsLimit: 0`（首页卡片只用名称/副标题/图片，**不读 specs**）+ `lite` ⇒
   *   载荷最小；区块内部的客户端 fetch 仍照常执行（会再刷新一次，行为与改造前一致）。
   */
  let initialCategories: ReturnType<typeof buildHomeProductLists>["cats"] = [];
  let initialProducts: ReturnType<typeof buildHomeProductLists>["prods"] = [];
  let initialFeatured: { featuredCategories: string[]; featuredProducts: string[] } = {
    featuredCategories: [],
    featuredProducts: [],
  };
  try {
    const ctx = await getTenantContext();
    const tabs = await getPublicProductTabs({
      specsLimit: 0,
      lite: true,
      siteWhere: buildSiteWhere(ctx?.siteId ?? null),
    });
    // 只把**区块真正用到的字段**摊平后注入（整树会把首页载荷放大 3~4 倍，见 lib/products-flat.ts 说明）
    const flat = buildHomeProductLists(tabs);
    initialCategories = flat.cats;
    initialProducts = flat.prods;
    const homeCfg = await prisma.homeConfig.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    initialFeatured = {
      featuredCategories: (homeCfg?.featuredCategories as string[]) || [],
      featuredProducts: (homeCfg?.featuredProducts as string[]) || [],
    };
  } catch (e) {
    console.error("[home] 产品区块首屏数据注入失败（回落到客户端取数）:", (e as Error)?.message);
  }

  return (
    <>
      {order.map((key) => {
        // 产品区块：把服务端取好的数据注入（其余区块保持原样）
        if (key === "products") {
          return (
            <Products
              key={key}
              initialCategories={initialCategories}
              initialProducts={initialProducts}
              initialFeatured={initialFeatured}
            />
          );
        }
        const Comp = SECTION_MAP[key];
        return Comp ? <Comp key={key} /> : null;
      })}
    </>
  );
}
