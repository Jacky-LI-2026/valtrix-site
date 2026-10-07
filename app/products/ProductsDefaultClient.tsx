"use client";

import { useState, useEffect, Suspense, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Rows3, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";

// “全部设备”视图标识
const ALL = "all";

/** 展示方式：grid=排列显示（全部型号平铺成"豆腐块"，**默认**）/ category=分类显示（按二级目录+分类分组） */
type ViewMode = "grid" | "category";

/**
 * 展示方式按钮文案（owner 2026-10-01）。
 * i18n 字典里暂无对应键，就地兜底 6 语种 —— 不把中文硬编码到英文/日文站。
 */
const VIEW_LABELS: Record<string, { grid: string; category: string }> = {
  zh: { grid: "排列显示", category: "分类显示" },
  en: { grid: "Grid view", category: "By category" },
  ja: { grid: "一覧表示", category: "分類表示" },
  ko: { grid: "전체 보기", category: "분류 보기" },
  fr: { grid: "Vue grille", category: "Par catégorie" },
  ar: { grid: "عرض شبكي", category: "حسب الفئة" },
};

/** 产品网格骨架（"接口未回"与 Suspense 兜底共用同一份） */
function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse border border-gray-200">
          <div className="aspect-square bg-gray-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 bg-gray-100" />
            <div className="h-3 w-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 整块加载骨架（Suspense fallback 用：自带容器与上下留白） */
function ProductsSkeleton() {
  return (
    <div className="container py-20">
      <ProductsGridSkeleton />
    </div>
  );
}

function ProductsContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  /**
   * ⚠️ owner 2026-10-01「处理全站类似的 404 问题」：
   *   `useProductTabs` 的首帧初值是**静态兜底树**（`lib/products.ts`），而它可能已经过期 ——
   *   实测左文站 `/products` 的 SSR HTML 里因此挂着 **14 条指向不存在型号的死链**
   *   （`/products/growth/zw-10d` 之类）。现改为：**接口没回来之前只出骨架**，
   *   不渲染任何拿不准的链接（真实数据到达后再渲染产品树）。
   */
  const { productTabs, loading: tabsLoading } = useProductTabs();
  const tabParam = searchParams.get("tab");
  const loc = createLocalizedGetter(locale);
  const [pageConfig, setPageConfig] = useState<any>(null);
  const viewLabels = VIEW_LABELS[locale] || VIEW_LABELS.zh;
  /** 插件状态：`product-selector` 启用时，产品中心右上角显示「快速选型」入口 */
  const [pluginOn, setPluginOn] = useState(false);
  useEffect(() => {
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPluginOn(!!(d?.state && d.state["product-selector"])))
      .catch(() => {});
  }, []);

  /**
   * 占位图用的站点 LOGO（owner 2026-10-07）：
   *   「产品点位图使用灰底色加 45% 透明的 LOGO 显示占位」
   * —— 与 Header 同源接口（`/api/public/site-config?key=logo`），兜底 `/images/logo.png`
   *    （两站 public 下都有该文件，故不需要按站点写死品牌资源）。
   */
  const [logoUrl, setLogoUrl] = useState("");
  useEffect(() => {
    fetch("/api/public/site-config?key=logo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.data) setLogoUrl(String(d.data));
      })
      .catch(() => {});
  }, []);

  // 获取页面配置
  useEffect(() => {
    fetch("/api/public/page-config?page=products")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setPageConfig(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // 全部产品总数（动态计算）
  const totalModels = productTabs.reduce(
    (sum, tab) => sum + tab.categories.reduce((s, c) => s + c.models.length, 0),
    0
  );

  // 初始：若 URL 带有效 tab 参数则优先显示该二级目录，否则显示全部设备
  const initialTab =
    tabParam && productTabs.some((tab) => tab.id === tabParam) ? tabParam : ALL;
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  // 展示方式：默认"排列显示"；只有显式带 ?view=category 才进分类视图
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get("view") === "category" ? "category" : "grid"
  );

  // 监听 URL 参数变化（如从导航下拉菜单点击带 ?tab= 跳转）
  useEffect(() => {
    const p = searchParams.get("tab");
    setActiveTab(
      p && productTabs.some((tab) => tab.id === p) ? p : ALL
    );
    setViewMode(searchParams.get("view") === "category" ? "category" : "grid");
  }, [searchParams]);

  /**
   * 统一构造 URL —— `tab` 与 `view` 两个参数都要保住。
   * （此前 selectTab 直接 `router.replace("/products?tab=x")`，会把 view 参数冲掉）
   */
  function pushQuery(nextTab: string, nextView: ViewMode) {
    const q = new URLSearchParams();
    if (nextTab !== ALL) q.set("tab", nextTab);
    if (nextView === "category") q.set("view", "category");
    const qs = q.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  }

  // 切换 Tab：更新状态并同步 URL，保证导航下拉再次点击同一目录也能触发
  function selectTab(id: string) {
    setActiveTab(id);
    pushQuery(id, viewMode);
  }

  // 切换展示方式
  function selectView(v: ViewMode) {
    setViewMode(v);
    pushQuery(activeTab, v);
  }

  const showAll = activeTab === ALL;
  const currentTab = showAll
    ? null
    : productTabs.find((tab) => tab.id === activeTab) || productTabs[0];

  // 需要渲染的 Tab：全部视图遍历所有；否则仅当前目录
  const tabsToRender = showAll ? productTabs : [currentTab as (typeof productTabs)[number]];

  // 排列显示：把当前范围（全部 / 某个二级目录）的所有型号拉平成一个列表，不再按分类分组
  const flatModels = tabsToRender.flatMap((tab) =>
    tab.categories.flatMap((category) => category.models.map((model) => ({ tabId: tab.id, model })))
  );

  const tabBtnBase =
    "px-6 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ";
  const tabBtnActive = "bg-primary text-white shadow-md";
  const tabBtnIdle = "bg-dark-50 text-dark-600 hover:bg-dark-100";

  /** 型号卡片（排列显示 / 分类显示共用同一份卡片，避免两处样式漂移） */
  /**
   * 列表卡片上只保留**单一取值、够短**的规格行（owner 2026-10-07：「此类内容在产品列表页不需要显示」）：
   *   · 含 `;`/`；` 的一律是"多条键值拼在一起"的原始规格串（如本站 G 系列的
   *     `MR尺寸 (in.): 1/4; 尺寸 mm (in.): 27.2 22.1 …`）⇒ 列表页不可读，丢掉；
   *   · 超过 40 字的说明型长文本（如针阀那条"多种填料材料可选…温压曲线…"）同样丢掉；
   *   · 剩余的最多显示 3 条（如「工作压力 / 工作温度范围」）。
   */
  const cardSpecsOf = (model: (typeof productTabs)[number]["categories"][number]["models"][number]) =>
    (model.specs || [])
      .map((spec) => ({ label: loc.get(spec, "label"), value: loc.get(spec, "value") }))
      .filter((s) => s.label && s.value && !/[;；]/.test(s.value) && s.value.length <= 40)
      .slice(0, 3);

  const renderCard = (tabId: string, model: (typeof productTabs)[number]["categories"][number]["models"][number]) => {
    const cardSpecs = cardSpecsOf(model);
    return (
    <Link
      key={model.id}
      href={`/products/${tabId}/${model.id}`}
      className="group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-xl transition-all duration-300"
    >
      {/* Model Image */}
      {/* 正方形 1:1 + 图片铺满（owner 2026-09-25：两者同时生效） */}
      <div className="aspect-square bg-dark-50 relative overflow-hidden">
        {model.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.image}
            alt={model.name}
            /* 铺满图片区（owner 2026-09-25：「产品图片充满背景」）：object-contain + p-4 → object-cover */
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          /*
            owner 2026-10-07：「产品点位图使用灰底色加 45% 透明的 LOGO 显示占位」
            —— 原来无图时铺 `/placeholders/generic-tech.webp`（车间照），在列表里辨识度低、
               且容易被误认成产品实拍；现改为**灰底 + 45% 透明站点 LOGO**的明确占位。
          */
          <div className="w-full h-full flex items-center justify-center bg-dark-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/images/logo.png"}
              alt={model.name}
              className="max-w-[70%] max-h-[45%] w-auto h-auto object-contain opacity-[0.45]"
            />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded">
          {model.model}
        </div>
      </div>

      {/* Model Info */}
      <div className="p-6">
        <h4 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">
          {loc.get(model, "name")}
        </h4>
        <p className="text-dark-500 text-sm leading-relaxed mb-4 line-clamp-2">
          {loc.get(model, "description")}
        </p>

        {/*
          Key Specs —— owner 2026-10-07：「此类内容在产品列表页不需要显示」。
          被点名的样例就是本页卡片的原始规格串：
            `NPT 外螺纹弯头本体` → `MR尺寸 (in.): 1/4; 尺寸 mm (in.): 27.2 22.1 9.6 …`
          这类值在列表页不可读、且与详情页重复 ⇒ 只保留**单一取值、够短**的规格行，整块为空时连容器一起不渲染。
        */}
        {cardSpecs.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {cardSpecs.map((spec) => (
              <div key={spec.label} className="flex justify-between text-xs">
                <span className="text-dark-400">
                  {spec.label}
                </span>
                <span className="text-dark-700 font-medium">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
            {t("viewDetails")}
            <ArrowRight size={14} className="rtl-flip" />
          </span>
          {model.purchaseMode === "shop" && model.shopSlug && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/shop/${model.shopSlug}`);
              }}
              className="inline-flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded group-hover:bg-primary-dark transition-colors"
              title={t("buyNow")}
            >
              {t("buyNow")}
            </button>
          )}
        </div>
      </div>
    </Link>
    );
  };

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("productsPageTitle")}
        titleEn={pageConfig?.titleEn || "Products"}
        subtitle={pageConfig?.subtitle || t("productsPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Covering gate, ball, butterfly, check, safety and regulating valve series with complete fluid control solutions"}
        breadcrumb={pageConfig?.breadcrumb || t("productsPageTitle")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Products"}
      />

      {/* Tab Navigation：全部设备 + 各二级目录（**接口回来后才渲染**，避免显示过期目录/计数） */}
      {!tabsLoading && (
      <section className="sticky top-16 z-40 bg-white border-b border-dark-100 shadow-sm">
        <div className="container">
          <div className="flex gap-1 overflow-x-auto py-3">
              <button
                key={ALL}
                onClick={() => selectTab(ALL)}
                className={`${tabBtnBase} ${showAll ? tabBtnActive : tabBtnIdle}`}
              >
                {t("allProducts")}
                <span className="ms-2 text-xs opacity-70">{totalModels}</span>
              </button>
              {productTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  className={`${tabBtnBase} ${
                    activeTab === tab.id ? tabBtnActive : tabBtnIdle
                  }`}
                >
                  {loc.get(tab, "name")}
                  <span className="ms-2 text-xs opacity-70">
                    {tab.categories.reduce((sum, c) => sum + c.models.length, 0)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </section>
      )}

      {/* Product Content */}
      {/* 上间距压到原来的约 30%（owner 2026-10-01：「距离上面容器距离…缩小到现在的30%」）：
          原 py-12/py-16 = 48/64px ⇒ 现固定 pt-5 = 20px。下间距保持不变。 */}
      <section className="pt-5 pb-12 lg:pb-16 bg-white">
        <div className="container">
          {/* 接口未回：只出骨架（不渲染静态兜底树里的链接，owner 2026-10-01 死链收口） */}
          {tabsLoading ? (
            <ProductsGridSkeleton />
          ) : (
          <>
          {/* 展示方式切换（owner 2026-10-01 二次口径：放在**产品列表区域**右上角，
              不要挤进上面的分类条 —— 那里横向溢出会把按钮裁掉） */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            {/* 「快速选型」入口（owner 2026-10-07：「做成一个类似排列显示的按钮风格」）
                ⇒ 与右侧「排列显示 / 分类显示」同一套视觉：外层浅灰胶囊 `bg-dark-50 p-1`
                  + 内层白底圆角按钮 `bg-white rounded-md shadow-sm text-primary`。
                为什么**不并进右侧那一组**：快速选型是「跳转」，那两个是「视图开关」，
                  混进同一个 group 语义会串；两枚胶囊左右分列，视觉仍属同一族。 */}
            {pluginOn ? (
              <div className="flex items-center gap-1 rounded-lg bg-dark-50 p-1">
                <Link
                  href="/products/selector"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-white text-primary shadow-sm transition-all hover:bg-primary/5"
                  title="按参数逐步筛选，直接给出可询价的型号"
                >
                  <Sparkles size={14} /> {locale === "zh" ? "快速选型" : locale === "ja" ? "クイック選定" : locale === "ko" ? "간편 선택" : locale === "fr" ? "Sélecteur rapide" : locale === "ar" ? "محدد سريع" : "Quick Selector"}
                </Link>
              </div>
            ) : (
              <span />
            )}
            <div
              className="flex items-center gap-1 rounded-lg bg-dark-50 p-1"
              role="group"
              aria-label={viewLabels.grid + " / " + viewLabels.category}
            >
              <button
                type="button"
                onClick={() => selectView("grid")}
                aria-pressed={viewMode === "grid"}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-dark-500 hover:text-dark"
                }`}
                title={viewLabels.grid}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">{viewLabels.grid}</span>
              </button>
              <button
                type="button"
                onClick={() => selectView("category")}
                aria-pressed={viewMode === "category"}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  viewMode === "category" ? "bg-white text-primary shadow-sm" : "text-dark-500 hover:text-dark"
                }`}
                title={viewLabels.category}
              >
                <Rows3 size={14} />
                <span className="hidden sm:inline">{viewLabels.category}</span>
              </button>
            </div>
          </div>

          {/* 排列显示（默认）：当前范围全部型号平铺成"豆腐块"，不显示分类分组 */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flatModels.map(({ tabId, model }) => (
                <Fragment key={model.id}>{renderCard(tabId, model)}</Fragment>
              ))}
            </div>
          ) : (
            tabsToRender.map((tab) => (
            <div key={tab.id}>
              {/* 全部视图下：显示二级目录（大分类）标识 */}
              {showAll && (
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-primary rounded" />
                  <h2 className="text-2xl font-bold text-dark">
                    {loc.get(tab, "name")}
                  </h2>
                  <span className="text-sm text-dark-400 bg-dark-50 px-2 py-0.5 rounded">
                    {tab.categories.reduce((sum, c) => sum + c.models.length, 0)}{" "}
                    {t("modelsCount")}
                  </span>
                </div>
              )}

              {tab.categories.map((category) => (
                <div key={category.id} className="mb-16 last:mb-0">
                  {/* Category Header */}
                  <div className="flex items-end justify-between mb-8 pb-4 border-b border-dark-100">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-8 bg-primary rounded" />
                        <h3 className="text-2xl font-bold text-dark">
                          {loc.get(category, "name")}
                        </h3>
                        <span className="text-sm text-dark-400 bg-dark-50 px-2 py-0.5 rounded">
                          {category.models.length} {t("modelsCount")}
                        </span>
                      </div>
                      <p className="text-dark-500 text-sm max-w-3xl ms-4">
                        {loc.get(category, "description")}
                      </p>
                    </div>
                  </div>

                  {/* Models Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.models.map((model) => (
                      <Fragment key={model.id}>{renderCard(tab.id, model)}</Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            ))
          )}
          </>
          )}
        </div>
      </section>
    </>
  );
}

export default function ProductsDefaultClient() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
