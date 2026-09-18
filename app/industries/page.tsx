"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";

interface Industry {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  image?: string | null;
  products: string[];
  productsEn: string[];
}

// 行业主题占位图（后台未上传图片时显示）
const INDUSTRY_PLACEHOLDERS: Record<string, string> = {
  petrochemical: "/placeholders/industry-petrochemical.webp",
  "water-treatment": "/placeholders/industry-water-treatment.webp",
  "natural-gas": "/placeholders/industry-natural-gas.webp",
  power: "/placeholders/industry-power.webp",
  "metallurgy-mining": "/placeholders/industry-metallurgy-mining.webp",
  "marine-offshore": "/placeholders/industry-marine-offshore.webp",
};
const getIndustryImage = (industry: Industry) =>
  industry.image || INDUSTRY_PLACEHOLDERS[industry.slug] || "/placeholders/industry-default.webp";

export default function IndustriesPage() {
  const { locale , t} = useI18n();
    const loc = createLocalizedGetter(locale);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const { pageConfig } = usePageConfig("industries");

  useEffect(() => {
    fetch("/api/public/industries")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setIndustries(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("industries")}
        titleEn={pageConfig?.titleEn || "Industries"}
        subtitle={pageConfig?.subtitle || t("industriesPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "VALTRIX precision fluid components serve semiconductor, biopharmaceutical, LED/display, solar, hydrogen and research laboratory industries"}
        breadcrumb={pageConfig?.breadcrumb || t("industries")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Industries"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          {loading ? (
            <div className="text-center py-20 text-dark-400">{t("loading")}</div>
          ) : (
            <div className="space-y-6">
              {industries.map((industry, index) => (
                <Link
                  key={industry.id}
                  href={`/industries/${industry.slug}`}
                  className="group grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-dark-50 rounded-lg p-8 lg:p-12 hover:bg-white hover:shadow-xl border border-transparent hover:border-primary transition-all duration-300"
                >
                  <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl font-black text-primary/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="w-10 h-0.5 bg-primary" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-dark mb-2 group-hover:text-primary transition-colors">
                      {loc.get(industry, "name")}
                    </h2>
                    <p className="text-dark-400 text-sm mb-4">{loc.get(industry, "tagline")}</p>
                    <p className="text-dark-600 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: loc.get(industry, "description") }} />
                    <div className="flex flex-wrap gap-2 mb-6">
                      {loc.getArray(industry, "products")?.map((p: string) => (
                        <span key={p} className="text-xs bg-white text-dark-600 px-3 py-1.5 rounded border border-dark-100 group-hover:border-primary/30">
                          {p}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {t("exploreSolutions")}
                      <ArrowRight size={14} className="rtl-flip" />
                    </span>
                  </div>
                  <div className={`aspect-[4/3] rounded-lg overflow-hidden relative bg-dark-900 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                    <img
                      src={getIndustryImage(industry)}
                      alt={loc.get(industry, "name")}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5 text-white">
                      <div className="text-3xl font-black text-white/25 leading-none mb-1">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <p className="text-sm font-medium">{loc.get(industry, "name")}</p>
                    </div>
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
