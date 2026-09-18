"use client";

import { useState, useEffect, useCallback } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";

interface CaseItem {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  industry: string;
  industryEn?: string;
  client: string;
  clientEn?: string;
  summary: string;
  summaryEn?: string;
  coverImage?: string | null;
  caseDate?: string | null;
  featured?: boolean;
}

const CASE_PLACEHOLDER = "/placeholders/generic-tech.webp";

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

export default function CasesPage() {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [items, setItems] = useState<CaseItem[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const { pageConfig } = usePageConfig("cases");

  const load = useCallback((ind: string) => {
    setLoading(true);
    const qs = ind ? `?industry=${encodeURIComponent(ind)}` : "";
    fetch("/api/public/cases" + qs)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/public/cases?limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const set = new Set<string>();
          data.forEach((c: CaseItem) => {
            const v = loc.get(c, "industry") as string;
            if (v) set.add(v);
          });
          setIndustries(Array.from(set));
        }
      })
      .catch(() => {});
    load("");
  }, [load]);

  const onFilter = (ind: string) => {
    setActive(ind);
    load(ind);
  };

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("casesPageTitle")}
        titleEn={pageConfig?.titleEn || "Success Cases"}
        subtitle={pageConfig?.subtitle || t("casesPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Real customer success stories powered by our technology and services"}
        breadcrumb={pageConfig?.breadcrumb || t("cases")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Cases"}
      />

      {/* 行业筛选 */}
      {industries.length > 0 && (
        <section className="pt-10 bg-white">
          <div className="container flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => onFilter("")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                active === "" ? "bg-primary text-white border-primary" : "border-dark-100 text-dark-600 hover:border-primary/40"
              }`}
            >
              {t("allCases")}
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => onFilter(ind)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                  active === ind ? "bg-primary text-white border-primary" : "border-dark-100 text-dark-600 hover:border-primary/40"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="py-12 lg:py-16 bg-white">
        <div className="container">
          {loading ? (
            <div className="text-center py-20 text-dark-400">{t("loading")}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-dark-400">{t("noContent") || "暂无案例"}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.slug}`}
                  className="group bg-white rounded-lg overflow-hidden border border-dark-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                >
                  <div className="aspect-[16/9] overflow-hidden relative bg-dark-900">
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
                    <div className="flex items-center gap-2 text-xs text-dark-400 mb-2">
                      {fmtDate(c.caseDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {fmtDate(c.caseDate)}
                        </span>
                      )}
                      {loc.get(c, "client") && <span>· {loc.get(c, "client")}</span>}
                    </div>
                    <h3 className="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors leading-snug">
                      {loc.get(c, "title")}
                    </h3>
                    <p className="text-sm text-dark-500 leading-relaxed line-clamp-2">
                      {loc.get(c, "summary")}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                      {t("viewDetails") || "查看详情"}
                      <ArrowRight size={14} className="rtl-flip" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
