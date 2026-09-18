"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";

interface SeriesCard {
  id: string;
  name: string;
  desc: string;
  image: string;
  href: string;
}

/**
 * UNILOK 精密工业风 — 产品展示（Tab 级产品系列网格）
 * 数据：/api/public/products（useProductTabs），无价格展示
 */
export default function ProductShowcase() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs, loading } = useProductTabs();

  const series: SeriesCard[] = productTabs.map((tab: any) => {
    const firstCat = tab.categories?.[0];
    const firstModel = firstCat?.models?.[0];
    return {
      id: tab.id,
      name: loc.get(tab, "name"),
      desc: firstCat ? loc.get(firstCat, "description") : "",
      image: firstModel?.image || "",
      href: `/products?tab=${tab.id}`,
    };
  });

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {t("unilokProductsTitle")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              {t("unilokProductsTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("unilokProductsSubtitle")}</p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 border border-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("unilokProductsMore")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200">
                <div className="aspect-square bg-gray-100" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-2/3 bg-gray-100" />
                  <div className="h-3 w-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="group relative border border-gray-200 bg-white transition-all duration-300 hover:border-accent hover:shadow-[0_16px_40px_rgba(15,52,96,0.08)]"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0F3460] to-[#1A4B8C]">
                      <span className="px-6 text-center text-lg font-bold uppercase tracking-wider text-white/70">
                        {s.name}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-accent transition-all duration-300 group-hover:w-full" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-primary transition-colors group-hover:text-accent">
                    {s.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dark-500">{s.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {t("viewDetails")}
                    <ArrowRight className="h-4 w-4 rtl-flip" />
                    <span className="absolute bottom-4 h-[2px] w-0 bg-accent transition-all duration-300 group-hover:w-16" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
