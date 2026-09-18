"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { industries as defaultIndustries } from "@/lib/industries";

export default function Industries() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [industriesData, setIndustriesData] = useState<any[]>([]);

  // 从API获取行业内容
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/industries")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setIndustriesData(data);
        }
      })
      .catch((err) => {
        console.warn("获取行业内容失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 从API数据构建行业列表
  const industries = industriesData.length > 0
    ? industriesData
    : defaultIndustries;

  return (
    <section className="tpl-section py-20 lg:py-28 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-block w-12 h-1 bg-primary mb-4" />
          <h2 className="tpl-title text-3xl md:text-4xl font-bold text-dark mb-4">{t("industryApplications")}</h2>
          <p className="tpl-scaled text-dark-500 max-w-2xl mx-auto">{t("industryApplicationsDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {industries.map((industry, index) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="tpl-card group relative bg-dark-50 hover:bg-dark rounded-lg p-6 lg:p-8 transition-all duration-300 overflow-hidden border border-transparent hover:border-primary"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary-800/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-1 h-10 bg-primary group-hover:bg-white transition-colors" />
                  <span className="text-3xl font-black text-dark-200 group-hover:text-white/20 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-dark group-hover:text-white mb-1 transition-colors">
                  {loc.get(industry, "name")}
                </h3>
                <p className="text-xs text-dark-400 group-hover:text-primary-200 mb-3 transition-colors">
                  {locale === "zh" && industry.nameEn}
                </p>
                <p className="text-sm text-dark-500 group-hover:text-white/80 leading-relaxed mb-4 transition-colors line-clamp-2">
                  {loc.get(industry, "tagline")}
                </p>
                <span className="inline-flex items-center gap-1 text-primary group-hover:text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-all">
                  {t("learnMore")}
                  <ArrowRight size={14} className="rtl-flip" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
