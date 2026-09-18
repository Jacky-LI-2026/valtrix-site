"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";
import UnilokPageHero from "./PageHero";
import UnilokProductCard from "./ProductCard";

// “全部系列”视图标识
const ALL = "all";

function UnilokProductsContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { productTabs } = useProductTabs();
  const loc = createLocalizedGetter(locale);

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(() =>
    tabParam && productTabs.some((tab) => tab.id === tabParam) ? tabParam : ALL
  );

  // 监听 URL 参数变化（导航下拉 ?tab= 跳转）
  useEffect(() => {
    const p = searchParams.get("tab");
    setActiveTab(
      p && productTabs.some((tab) => tab.id === p) ? p : ALL
    );
  }, [searchParams, productTabs]);

  function selectTab(id: string) {
    setActiveTab(id);
    router.replace(id === ALL ? "/products" : `/products?tab=${id}`, {
      scroll: false,
    });
  }

  const showAll = activeTab === ALL;
  const currentTab = showAll
    ? null
    : productTabs.find((tab) => tab.id === activeTab) || productTabs[0] || null;
  const tabsToRender = showAll ? productTabs : currentTab ? [currentTab] : [];

  const totalModels = productTabs.reduce(
    (sum, tab) => sum + tab.categories.reduce((s, c) => s + c.models.length, 0),
    0
  );

  const tabBtnBase =
    "whitespace-nowrap border px-5 py-2 text-sm font-medium transition-colors ";
  const tabBtnActive =
    "border-primary bg-primary text-white";
  const tabBtnIdle =
    "border-gray-200 bg-white text-dark-600 hover:border-accent hover:text-accent";

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowProducts")}
        title={t("productsPageTitle")}
        subtitle={t("unilokProductsIntro")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("products") },
        ]}
      />

      {/* Tab 导航（sticky） */}
      <section className="sticky top-16 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto py-3">
            <button
              type="button"
              onClick={() => selectTab(ALL)}
              className={`${tabBtnBase} ${
                showAll ? tabBtnActive : tabBtnIdle
              }`}
            >
              {t("unilokAllSeries")}
              <span className="ms-2 text-xs opacity-70">{totalModels}</span>
            </button>
            {productTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`${tabBtnBase} ${
                  activeTab === tab.id ? tabBtnActive : tabBtnIdle
                }`}
              >
                {loc.get(tab, "name")}
                <span className="ms-2 text-xs opacity-70">
                  {tab.categories.reduce(
                    (sum, c) => sum + c.models.length,
                    0
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 产品内容 */}
      <section className="bg-white py-14 lg:py-20">
        <div className="container">
          {tabsToRender.length === 0 && (
            <p className="py-20 text-center text-dark-400">
              {t("unilokNoProducts")}
            </p>
          )}
          {tabsToRender.map((tab) => {
            const tabCount = tab.categories.reduce(
              (sum, c) => sum + c.models.length,
              0
            );
            return (
              <div key={tab.id} className={showAll ? "mb-16" : ""}>
                {/* 系列标题（左侧橙红竖线） */}
                <div className="mb-10 flex items-center gap-3">
                  <span className="h-8 w-1 bg-accent" />
                  <h2 className="text-2xl font-bold text-dark md:text-3xl">
                    {loc.get(tab, "name")}
                  </h2>
                  <span className="bg-dark-50 px-2 py-0.5 text-xs text-dark-400">
                    {tabCount} {t("modelsCount")}
                  </span>
                </div>

                {tab.categories.map((category) => (
                  <div key={category.id} className="mb-14 last:mb-0">
                    {/* 分类标题 */}
                    <div className="mb-6 flex items-center gap-3">
                      <span className="h-5 w-0.5 bg-accent/70" />
                      <h3 className="text-xl font-bold text-dark">
                        {loc.get(category, "name")}
                      </h3>
                      {category.models.length > 0 && (
                        <span className="text-xs text-dark-400">
                          {category.models.length} {t("modelsCount")}
                        </span>
                      )}
                    </div>

                    {/* 产品网格（3 列） */}
                    {category.models.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {category.models.map((model) => (
                          <UnilokProductCard
                            key={model.id}
                            product={model}
                            tabId={tab.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="border border-dashed border-gray-200 py-10 text-center text-sm text-dark-400">
                        {t("unilokNoProducts")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export default function UnilokProductsPage() {
  return (
    <Suspense fallback={null}>
      <UnilokProductsContent />
    </Suspense>
  );
}
