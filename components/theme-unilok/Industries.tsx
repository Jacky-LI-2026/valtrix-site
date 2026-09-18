"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { industries as defaultIndustries } from "@/lib/industries";

/**
 * UNILOK 精密工业风 — 应用领域
 * 数据：/api/public/industries（失败回退静态数据）
 */
export default function Industries() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/industries", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setList(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const industries = list.length > 0 ? list : defaultIndustries;

  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              {t("unilokIndustriesEyebrow")}
            </span>
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            {t("unilokIndustriesTitle")}
          </h2>
          <p className="mt-4 text-dark-500">{t("unilokIndustriesSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-3">
          {industries.slice(0, 6).map((industry, index) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group relative bg-white p-8 transition-all duration-300 hover:bg-primary"
            >
              {/* 编号：线框数字角标 */}
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center border border-gray-300 font-mono text-sm font-bold text-dark-300 transition-colors group-hover:border-white/40 group-hover:text-white/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="h-5 w-5 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 rtl-flip" />
              </div>

              <h3 className="mt-8 text-xl font-bold text-primary transition-colors group-hover:text-white">
                {loc.get(industry, "name")}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dark-500 transition-colors group-hover:text-white/75">
                {loc.get(industry, "tagline") || loc.get(industry, "description")}
              </p>

              <div className="mt-6 h-px w-8 bg-accent transition-all duration-300 group-hover:w-16" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
