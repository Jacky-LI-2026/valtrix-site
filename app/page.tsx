import Hero from "@/components/sections/Hero";
import Products from "@/components/sections/Products";
import Features from "@/components/sections/Features";
import Stats from "@/components/sections/Stats";
import About from "@/components/sections/About";
import Industries from "@/components/sections/Industries";
import CaseShowcase from "@/components/sections/CaseShowcase";
import Services from "@/components/sections/Services";
import CTA from "@/components/sections/CTA";
import UnilokHome from "@/components/theme-unilok/UnilokHome";
import KitzHome from "@/components/theme-kitzsct/KitzHome";
import { getHomeSectionConfig } from "@/lib/home-sections";
import { getActiveTemplateSlug, UNILOK_INDUSTRIAL_SLUG, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";

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
  // UNILOK 精密工业风模板（templateSlug === 'unilok-industrial'）整页替换
  const templateSlug = await getActiveTemplateSlug();
  if (templateSlug === UNILOK_INDUSTRIAL_SLUG) {
    return <UnilokHome />;
  }

  // KITZ 洁净科技风模板（kitz-clean）：整页替换
  if (templateSlug === KITZ_CLEAN_SLUG) {
    return <KitzHome />;
  }

  // 默认模板：前台组件市场，按后台配置启停/排序渲染（默认全部显示）
  let order: string[] = [];
  try {
    const cfg = await getHomeSectionConfig();
    order = cfg.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.key);
  } catch {
    order = ["hero", "products", "features", "stats", "about", "industries", "cases", "services", "cta"];
  }

  return (
    <>
      {order.map((key) => {
        const Comp = SECTION_MAP[key];
        return Comp ? <Comp key={key} /> : null;
      })}
    </>
  );
}
