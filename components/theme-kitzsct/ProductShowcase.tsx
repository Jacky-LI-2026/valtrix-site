"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";
import KitzProductCard from "./ProductCard";

/**
 * KITZ SCT 日式工业风 — 产品系列卡
 *
 * 数据：`useProductTabs()` → `/api/public/products`（与 UNILOK ProductShowcase 同源）。
 * 卡片本体复用另一个块交付的 `KitzProductCard`（本块不改它）。
 *
 * ⚠️ 为什么传的是「代表型号」而不是 Tab 本身 —— **已按真实实现校正**：
 *   `KitzProductCard` 的链接是 `/products/${tabId}/${product.id}`，
 *   即它渲染的是**型号**详情卡；Tab 本身**没有图片也没有型号 id**，
 *   若把合成对象（id=tabId）塞进去会得到 `/products/xxx/xxx` 这种假链接。
 *   故这里对每个 Tab 取其首个分类的首个型号作为**系列代表**，
 *   配上该 Tab 的 id 作为 tabId —— 链接落到真实型号详情页，型号标签/参数也都是真数据。
 *   Tab 没有型号时退化为一张「系列入口」占位卡（仅渲染名称 + 跳 `/products?tab=`）。
 */
export default function KitzProductShowcase() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs, loading } = useProductTabs();

  const series = productTabs.map((tab: any) => {
    const firstCat = tab?.categories?.[0];
    const firstModel = firstCat?.models?.[0] ?? null;
    return {
      id: String(tab.id),
      name: loc.get(tab, "name"),
      desc: firstCat ? loc.get(firstCat, "description") : "",
      image: firstModel?.image || "",
      model: firstModel,
    };
  });

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzProductsEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-dark md:text-4xl">
              {t("kitzProductsTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("kitzProductsSubtitle")}</p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 border border-dark px-6 py-3 text-sm font-semibold uppercase tracking-wider text-dark transition-colors hover:bg-dark hover:text-white"
          >
            {t("kitzProductsMore")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200">
                <div className="aspect-square bg-gray-100" />
                <div className="space-y-3 p-6">
                  <div className="h-4 w-2/3 bg-gray-100" />
                  <div className="h-3 w-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((s) =>
              s.model ? (
                <KitzProductCard key={s.id} tabId={s.id} product={s.model} />
              ) : (
                // 该系列没有任何型号：渲染系列入口卡，避免出现假详情链接
                <Link
                  key={s.id}
                  href={`/products?tab=${s.id}`}
                  className="group flex flex-col border border-gray-200 bg-white transition-colors hover:border-dark"
                >
                  <div className="flex aspect-square items-center justify-center border-b border-gray-100 bg-gray-50 p-6">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain opacity-90 transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="text-center font-mono text-xs uppercase tracking-[0.3em] text-dark-300">
                        {t("kitzProductsImageAlt")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-bold tracking-tight text-dark transition-colors group-hover:text-dark-600">
                      {s.name}
                    </h3>
                    <p className="mb-4 mt-2 line-clamp-2 text-sm leading-relaxed text-dark-500">{s.desc}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 border-t border-gray-100 pt-4 text-sm font-semibold text-dark">
                      {t("kitzProductsMore")}
                      <ArrowRight className="h-4 w-4 rtl-flip" />
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
