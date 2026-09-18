"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, FileText, Award, FileImage, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";

const iconMap: Record<string, any> = {
  FileText,
  Award,
  FileImage,
};

interface ResourceCategory {
  id: string;
  type: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  items: ResourceItem[];
}

interface ResourceItem {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  format: string;
  size: string;
  fileUrl: string;
}

export default function ResourcesPage() {
  const { locale , t} = useI18n();
  const loc = createLocalizedGetter(locale);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { pageConfig } = usePageConfig("resources");

  useEffect(() => {
    fetch("/api/public/resources")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("resources")}
        titleEn={pageConfig?.titleEn || "Resources"}
        subtitle={pageConfig?.subtitle || t("resourcesPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Product catalogs, certificates, drawings and other technical resources for download"}
        breadcrumb={pageConfig?.breadcrumb || t("resources")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Resources"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          {loading ? (
            <div className="text-center py-20 text-dark-400">{t("loading")}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
              {categories.map((category) => {
                const Icon = iconMap[category.icon] || FileText;
                return (
                  <div key={category.id} className="bg-white border border-dark-100 rounded-lg p-8 hover:border-primary hover:shadow-xl transition-all">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                      <Icon size={28} className="text-primary" />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-dark">{loc.get(category, "title")}</h3>
                      <span className="text-sm text-primary font-medium">{category.items.length} {t("filesCount")}</span>
                    </div>
                    <p className="text-dark-500 text-sm leading-relaxed mb-6">{loc.get(category, "description")}</p>
                    <ul className="space-y-2 mb-6">
                      {category.items.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm text-dark-600">
                          <Download size={14} className={item.fileUrl ? "text-dark-300" : "text-gray-300"} />
                          <span className={item.fileUrl ? "" : "text-gray-400"}>
                            {loc.get(item, "title")}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/resources/${category.type}`}
                      className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all"
                    >
                      {t("viewAll")}
                      <ArrowRight size={14} className="rtl-flip" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-dark-50 rounded-lg p-8 lg:p-10 text-center">
            <h3 className="text-xl font-bold text-dark mb-3">{t("needMoreResources")}</h3>
            <p className="text-dark-500 mb-6 max-w-2xl mx-auto">
              {t("resourcesContactDesc")}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded font-medium transition-all"
            >
              {t("contactTechSupport")}
              <ArrowRight size={18} className="rtl-flip" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
