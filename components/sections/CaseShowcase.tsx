"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

const CASE_PLACEHOLDER = "/placeholders/generic-tech.webp";

/**
 * 首页·精选案例（featured=true 的案例，无则取最新 3 条）
 */
export default function CaseShowcase() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/cases?featured=1&limit=6")
      .then((r) => r.json())
      .then(async (featured: any[]) => {
        let list = Array.isArray(featured) ? featured : [];
        if (list.length < 3) {
          // 精选不足时用最新案例补齐
          const latest = await fetch("/api/public/cases?limit=6")
            .then((r2) => r2.json())
            .catch(() => []);
          if (Array.isArray(latest)) {
            const ids = new Set(list.map((c: any) => String(c.id)));
            const fill = latest.filter((c: any) => !ids.has(String(c.id)));
            list = [...list, ...fill].slice(0, 3);
          }
        }
        if (!cancelled) setCases(list.slice(0, 3));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (cases.length === 0) return null;

  return (
    <section className="tpl-section py-20 lg:py-28 bg-dark-50">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-block w-12 h-1 bg-primary mb-4" />
          <h2 className="tpl-title text-3xl md:text-4xl font-bold text-dark mb-4">{t("featuredCases")}</h2>
          <p className="tpl-scaled text-dark-500 max-w-2xl mx-auto">{t("featuredCasesDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cases.map((c: any) => (
            <Link
              key={c.id}
              href={`/cases/${c.slug}`}
              className="tpl-card group bg-white rounded-lg overflow-hidden border border-dark-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="aspect-[16/10] overflow-hidden relative bg-dark-900">
                <img
                  src={c.coverImage || CASE_PLACEHOLDER}
                  alt={loc.get(c, "title")}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {loc.get(c, "industry") && (
                  <span className="absolute top-3 left-3 text-xs bg-black/60 text-white px-2.5 py-1 rounded">
                    {loc.get(c, "industry")}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                  {loc.get(c, "title")}
                </h3>
                <p className="text-sm text-dark-500 leading-relaxed line-clamp-2">
                  {loc.get(c, "summary")}
                </p>
                <span className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                  {t("learnMore")}
                  <ArrowRight size={14} className="rtl-flip" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/cases"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("allCases") || "查看全部案例"}
            <ArrowRight size={16} className="rtl-flip" />
          </Link>
        </div>
      </div>
    </section>
  );
}
