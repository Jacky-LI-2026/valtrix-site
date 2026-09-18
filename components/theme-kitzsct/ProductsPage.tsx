"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";
import KitzPageHero from "./PageHero";
import KitzProductCard from "./ProductCard";

/**
 * KITZ SCT 日式工业风 · 产品列表页
 *
 * 为什么用 Suspense 包一层：
 *   本组件读取 useSearchParams()（?tab= 由导航下拉透传）。Next.js App Router 中
 *   直接使用 useSearchParams 的客户端组件若落在静态壳里会触发 CSR bailout 构建报错，
 *   故拆成「外壳（无 hooks）+ 内层（持有 searchParams）」——与同仓其它主题同构。
 */

// 「全部系列」视图标识（不进 URL 的伪 tab）
const ALL = "all";

function KitzProductsContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { productTabs, loading } = useProductTabs();
  const loc = createLocalizedGetter(locale);

  const tabParam = searchParams.get("tab");
  // 初值即校验：URL 上的 tab 可能是已下线的 id，非法值一律回落「全部」
  const [activeTab, setActiveTab] = useState<string>(() =>
    tabParam && productTabs.some((tab) => tab.id === tabParam) ? tabParam : ALL
  );

  // 导航下拉用 router.replace 改 ?tab=，此处同步外部变化（含浏览器前进/后退）
  useEffect(() => {
    const p = searchParams.get("tab");
    setActiveTab(p && productTabs.some((tab) => tab.id === p) ? p : ALL);
  }, [searchParams, productTabs]);

  function selectTab(id: string) {
    setActiveTab(id);
    // scroll:false —— 切换系列时保持阅读位置，避免被顶到页面头部
    router.replace(id === ALL ? "/products" : `/products?tab=${id}`, {
      scroll: false,
    });
  }

  const showAll = activeTab === ALL;
  const currentTab = showAll
    ? null
    : productTabs.find((tab) => tab.id === activeTab) || productTabs[0] || null;
  const tabsToRender = showAll ? productTabs : currentTab ? [currentTab] : [];

  const countOfTab = (tab: (typeof productTabs)[number]) =>
    tab.categories.reduce((sum, c) => sum + c.models.length, 0);

  const totalModels = productTabs.reduce((sum, tab) => sum + countOfTab(tab), 0);

  // 系列/分类/产品全为 0 时的统一空态判定（避免逐层各写一遍）
  const isEmpty = tabsToRender.length === 0 || totalModels === 0;

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowProducts")}
        title={t("products")}
        subtitle={t("kitzProductsIntro")}
        breadcrumb={[{ label: t("home"), href: "/" }, { label: t("products") }]}
      />

      {/* 系列切换：细线分段条（KITZ 风 —— 无圆角、无阴影，仅靠 1px 分隔）
          为什么 sticky：系列内产品较长，滚动后仍需能切换系列 */}
      <section className="sticky top-16 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container">
          <div className="flex overflow-x-auto">
            <button
              type="button"
              onClick={() => selectTab(ALL)}
              className={`shrink-0 border-b-2 px-5 py-4 text-sm font-medium tracking-wide transition-colors ${
                showAll
                  ? "border-primary text-dark"
                  : "border-transparent text-dark-400 hover:text-dark"
              }`}
            >
              {t("kitzAllSeries")}
              <span className="ms-2 text-xs tabular-nums text-dark-300">
                {totalModels}
              </span>
            </button>
            {productTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`shrink-0 border-b-2 px-5 py-4 text-sm font-medium tracking-wide transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-dark"
                    : "border-transparent text-dark-400 hover:text-dark"
                }`}
              >
                {loc.get(tab, "name")}
                <span className="ms-2 text-xs tabular-nums text-dark-300">
                  {countOfTab(tab)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container">
          {/* 加载态：不闪空态文案，先占位保持版式稳定 */}
          {loading && !isEmpty && (
            <div className="mb-10 h-px w-full animate-pulse bg-gray-200" />
          )}

          {isEmpty ? (
            <p className="border border-dashed border-gray-200 py-24 text-center text-sm text-dark-400">
              {t("kitzNoProducts")}
            </p>
          ) : (
            tabsToRender.map((tab, tabIndex) => (
              <div key={tab.id} className={showAll ? "mb-20 last:mb-0" : ""}>
                {/* 系列标题：序号 + 名称 + 型号计数，底边一条实线（KITZ 的分节方式） */}
                <div className="mb-12 flex items-end justify-between border-b border-dark pb-4">
                  <div className="flex items-baseline gap-4">
                    <span className="text-[11px] font-semibold tabular-nums tracking-[0.3em] text-dark-300">
                      {String(tabIndex + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-dark md:text-3xl">
                      {loc.get(tab, "name")}
                    </h2>
                  </div>
                  <span className="shrink-0 text-xs tracking-widest text-dark-400">
                    {countOfTab(tab)} {t("modelsCount")}
                  </span>
                </div>

                {tab.categories.map((category) => (
                  <div key={category.id} className="mb-14 last:mb-0">
                    {/* 分类行：小方块标记 + 中文名（方形，不用圆点） */}
                    <div className="mb-6 flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 bg-primary" />
                      <h3 className="text-lg font-bold tracking-tight text-dark">
                        {loc.get(category, "name")}
                      </h3>
                      {category.models.length > 0 && (
                        <span className="text-xs tabular-nums text-dark-300">
                          {category.models.length} {t("modelsCount")}
                        </span>
                      )}
                    </div>

                    {/* 卡片自带描边（KitzProductCard 契约），此处只负责栅格，不再叠加底色网格 */}
                    {category.models.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {category.models.map((model) => (
                          <KitzProductCard
                            key={model.id}
                            product={model}
                            tabId={tab.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="border border-dashed border-gray-200 py-10 text-center text-sm text-dark-400">
                        {t("kitzNoProducts")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export default function KitzProductsPage() {
  return (
    <Suspense fallback={null}>
      <KitzProductsContent />
    </Suspense>
  );
}
