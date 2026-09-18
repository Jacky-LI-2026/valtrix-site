"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, Settings, Microwave, Wrench, Headphones, FlaskConical, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";

const iconMap: Record<string, any> = {
  Settings,
  Microwave,
  Wrench,
  Headphones,
  FlaskConical,
  ShieldCheck,
};

interface Service {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  description: string;
  descriptionEn: string;
  features: { title: string; desc: string }[];
  process: { step: string; title: string; desc: string }[];
  icon: string;
  sortOrder: number;
  status: string;
}

export default function ServicesPage() {
  const { t, locale } = useI18n();
    const loc = createLocalizedGetter(locale);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { pageConfig } = usePageConfig("services");

  useEffect(() => {
    fetch("/api/public/services")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setServices(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("services")}
        titleEn={pageConfig?.titleEn || "Services"}
        subtitle={pageConfig?.subtitle || t("servicesPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "From customization to system integration, technical support to after-sales, full lifecycle professional services"}
        breadcrumb={pageConfig?.breadcrumb || t("services")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Services"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {services.map((service, index) => {
              const Icon = iconMap[service.icon] || Settings;
              const isHighlight = index === 1; // 技术支持服务高亮
              return (
                <Link
                  key={service.id}
                  href={`/services/${service.slug}`}
                  className={`group relative rounded-lg p-8 lg:p-10 transition-all duration-300 ${
                    isHighlight ? "bg-primary hover:bg-primary-600 text-white" : "bg-dark-50 hover:bg-dark-100"
                  }`}
                >
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 ${
                    isHighlight ? "bg-white/20" : "bg-primary/10"
                  }`}>
                    <Icon size={28} className={isHighlight ? "text-white" : "text-primary"} />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${isHighlight ? "text-white" : "text-dark"}`}>
                    {loc.get(service, "title")}
                  </h3>
                  <p className={`text-sm leading-relaxed mb-6 ${
                    isHighlight ? "text-white/80" : "text-dark-500"
                  }`}
                    dangerouslySetInnerHTML={{ __html: loc.get(service, "description") || loc.get(service, "subtitle") }}
                  />
                  <div className="space-y-2 mb-6">
                    {loc.getArray(service, "features").slice(0, 4).map((feature, i) => (
                      <div key={i} className={`flex items-center gap-2 text-sm ${
                        isHighlight ? "text-white/90" : "text-dark-600"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isHighlight ? "bg-white" : "bg-primary"}`} />
                        {typeof feature === "string" ? feature : loc.get(feature, "title")}
                      </div>
                    ))}
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-medium ${
                    isHighlight ? "text-white" : "text-primary"
                  }`}>
                    {t("learnMoreAboutUs")}
                    <ArrowRight size={16} className="rtl-flip group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            {t("needCustomService")}
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            {t("contactTeamDiscuss")}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all"
          >
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}
