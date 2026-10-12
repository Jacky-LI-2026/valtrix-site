"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useState, useEffect } from "react";
// 扁平列表的**类型与映射**都在 lib/products-flat.ts（纯函数，服务端页面也用它做首屏注入）
import { buildHomeProductLists, type HomeCategoryItem as CategoryItem, type HomeProductItem as ProductItem } from "@/lib/products-flat";

/**
 * 首页产品区块。
 *
 * `initialCategories` / `initialProducts` / `initialFeatured`：由 `app/page.tsx`（服务端）注入
 * ⇒ **首屏 HTML 里就有分类/产品内链**（owner 2026-10-12「如何让百度完整收录」：百度几乎不执行 JS，
 * 纯客户端取数的区块在爬虫眼里是空的）。注入的是**摊平后的小列表**（见 lib/products-flat.ts），
 * 不再把整棵产品树塞进首页载荷。不注入时保持原行为：挂载后再 fetch。
 */
export default function Products({
  initialCategories,
  initialProducts,
  initialFeatured,
}: {
  initialCategories?: CategoryItem[];
  initialProducts?: ProductItem[];
  initialFeatured?: { featuredCategories?: string[]; featuredProducts?: string[] };
} = {}) {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);

  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories ?? []);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts ?? []);
  const [featuredCategories, setFeaturedCategories] = useState<string[]>(initialFeatured?.featuredCategories || []);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>(initialFeatured?.featuredProducts || []);

  // 获取产品数据和首页配置
  useEffect(() => {
    Promise.all([
      // lite 档：首页产品区只渲染分类名与卡片（名称/图片），不需要六语种正文与卖点
      fetch("/api/public/products?specs=3&lite=1").then((r) => r.json()),
      fetch("/api/public/home-config").then((r) => r.json()),
    ])
      .then(([prodData, homeData]) => {
        // 与首屏注入**同一份**映射逻辑（见 lib/products-flat.ts）
        const { cats, prods } = buildHomeProductLists(prodData?.data || []);
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
