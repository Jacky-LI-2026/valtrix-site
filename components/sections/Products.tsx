"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useState, useEffect } from "react";

interface ProductItem {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  subtitle?: string;
  subtitleEn?: string;
  subtitleJa?: string;
  subtitleKo?: string;
  subtitleFr?: string;
  subtitleAr?: string;
  tabSlug: string;
}

interface CategoryItem {
  slug: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionJa?: string;
  descriptionKo?: string;
  descriptionFr?: string;
  descriptionAr?: string;
}

export default function Products() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<string[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);

  // 获取产品数据和首页配置
  useEffect(() => {
    Promise.all([
      // lite 档：首页产品区只渲染分类名与卡片（名称/图片），不需要六语种正文与卖点
      fetch("/api/public/products?specs=3&lite=1").then((r) => r.json()),
      fetch("/api/public/home-config").then((r) => r.json()),
    ])
      .then(([prodData, homeData]) => {
        const tabs = prodData?.data || [];
        const cats: CategoryItem[] = [];
        const prods: ProductItem[] = [];
        tabs.forEach((tab: any) => {
          cats.push({
            slug: tab.id,
            name: tab.name,
            nameEn: tab.nameEn,
            nameJa: tab.nameJa,
            nameKo: tab.nameKo,
            nameFr: tab.nameFr,
            nameAr: tab.nameAr,
            description: tab.categories?.[0]?.description || "",
            descriptionEn: tab.categories?.[0]?.descriptionEn || "",
            descriptionJa: tab.categories?.[0]?.descriptionJa || "",
            descriptionKo: tab.categories?.[0]?.descriptionKo || "",
            descriptionFr: tab.categories?.[0]?.descriptionFr || "",
            descriptionAr: tab.categories?.[0]?.descriptionAr || "",
          });
          tab.categories?.forEach((cat: any) => {
            cat.models?.forEach((p: any) => {
              prods.push({
                id: p.id,
                slug: p.id,
                name: p.name,
                nameEn: p.nameEn,
                nameJa: p.nameJa,
                nameKo: p.nameKo,
                nameFr: p.nameFr,
                nameAr: p.nameAr,
                subtitle: p.subtitle || p.summary || "",
                subtitleEn: p.subtitleEn || p.summaryEn || "",
                subtitleJa: p.subtitleJa || p.summaryJa || "",
                subtitleKo: p.subtitleKo || p.summaryKo || "",
                subtitleFr: p.subtitleFr || p.summaryFr || "",
                subtitleAr: p.subtitleAr || p.summaryAr || "",
                tabSlug: tab.id,
              });
            });
          });
        });
        setCategories(cats);
        setProducts(prods);
        setFeaturedCategories(homeData?.data?.featuredCategories || []);
        setFeaturedProducts(homeData?.data?.featuredProducts || []);
      })
      .catch(() => {});
  }, []);

  // 显示的类别：有推荐则按推荐顺序，否则显示全部
  const displayCategories = featuredCategories.length > 0
    ? featuredCategories.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is CategoryItem => c !== undefined)
    : categories;

  // 显示的产品：有推荐则按推荐顺序，否则不显示（默认只显示类别）
  const displayProducts = featuredProducts.length > 0
    ? featuredProducts.map((slug) => products.find((p) => p.slug === slug)).filter((p): p is ProductItem => p !== undefined)
    : [];

  // 如果没有任何配置，显示全部类别（原行为）
  const showAllCategories = featuredCategories.length === 0 && featuredProducts.length === 0;

  return (
    <section className="tpl-section py-20 lg:py-28 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-block w-12 h-1 bg-primary mb-4" />
          <h2 className="tpl-title text-3xl md:text-4xl font-bold text-dark mb-4">{t("productCenter")}</h2>
          <p className="tpl-scaled text-dark-500 max-w-2xl mx-auto">{t("productCenterDesc")}</p>
        </div>

        {/* 推荐产品类别 */}
        {(displayCategories.length > 0 || showAllCategories) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
            {displayCategories.map((category, index) => (
              <Link
                key={category.slug}
                href={`/products?tab=${category.slug}`}
                className="tpl-card group relative bg-white border border-dark-100 rounded-lg p-8 hover:border-primary hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-4 end-5 text-5xl font-black text-dark-50 group-hover:text-primary/10 transition-colors">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="w-10 h-0.5 bg-primary mb-6 group-hover:w-16 transition-all duration-300" />
                <h3 className="text-xl font-bold text-dark mb-1 group-hover:text-primary transition-colors relative z-10">
                  {loc.get(category, "name")}
                </h3>
                <p className="text-dark-500 text-sm leading-relaxed mb-6 relative z-10 line-clamp-3">
                  {loc.get(category, "description")}
                </p>
                <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all relative z-10">
                  {t("viewDetails")}
                  <ArrowRight size={14} className="rtl-flip" />
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* 推荐具体产品 */}
        {displayProducts.length > 0 && (
          <>
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-dark">{t("featuredProducts") || "推荐产品"}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {displayProducts.map((product, index) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.tabSlug}/${product.slug}`}
                  className="tpl-card group relative bg-dark-50 border border-dark-100 rounded-lg p-6 hover:border-primary hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-3 end-4 text-4xl font-black text-dark-100 group-hover:text-primary/10 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="w-8 h-0.5 bg-primary mb-4 group-hover:w-12 transition-all duration-300" />
                  <h4 className="text-lg font-bold text-dark mb-1 group-hover:text-primary transition-colors relative z-10">
                    {loc.get(product, "name")}
                  </h4>
                  <p className="text-dark-500 text-xs leading-relaxed mb-4 relative z-10 line-clamp-2">
                    {loc.get(product, "subtitle")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-primary text-xs font-medium group-hover:gap-2 transition-all relative z-10">
                    {t("viewDetails")}
                    <ArrowRight size={12} className="rtl-flip" />
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="text-center mt-12">
          <Link
            href="/products"
            className="btn-primary inline-flex items-center gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 rounded font-medium transition-all"
          >
            {t("viewAllProducts")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </div>
    </section>
  );
}
