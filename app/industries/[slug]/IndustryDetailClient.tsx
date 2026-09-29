"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Lightbulb, ChevronLeft, Download, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { preserveLeadingSpaces } from "@/lib/rich-text";
import { HeroBackground } from "@/lib/page-hero-config";
import DownloadGateButton from "@/components/ui/DownloadGateButton";

interface PageProps {
  params: { slug: string };
}

interface Industry {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  challenges: string[];
  challengesEn: string[];
  solutions: { title: string; desc: string; titleEn: string; descEn: string }[];
  products: string[];
  productsEn: string[];
  cases: { title: string; desc: string; titleEn: string; descEn: string }[];
  image?: string | null;
  video?: string;
  solutionFile?: string | null;
  solutionFileName?: string | null;
  relatedProductSlugs?: string[] | null;
  relatedIndustrySlugs?: string[] | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  nameKo: string;
  nameFr: string;
  nameAr: string;
  model: string;
  tabSlug: string;
  tabName: string;
  tabNameEn: string;
  tabNameJa: string;
  tabNameKo: string;
  tabNameFr: string;
  tabNameAr: string;
  categoryName: string;
  categoryNameEn: string;
  categoryNameJa: string;
  categoryNameKo: string;
  categoryNameFr: string;
  categoryNameAr: string;
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

export default function IndustryDetailClient({ params }: PageProps) {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [relatedIndustries, setRelatedIndustries] = useState<Industry[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/public/industries?slug=${params.slug}`),
      fetch("/api/public/industries"),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) throw new Error("not found");
        const ind = await r1.json();
        const all = await r2.json();
        if (!alive) return;
        setIndustry(ind);
        if (Array.isArray(all)) setAllIndustries(all);
        // 探索其他行业：后台配置优先，未配置自动取前 3
        const relIds = Array.isArray(ind?.relatedIndustrySlugs) ? ind.relatedIndustrySlugs : [];
        const rec =
          relIds.length > 0
            ? relIds.map((s: string) => all.find((i: Industry) => i.slug === s)).filter(Boolean)
            : all.filter((i: Industry) => i.slug !== params.slug).slice(0, 3);
        setRelatedIndustries(rec);
        // 相关产品：后台配置了推荐产品时按 slug 关联真实产品
        const prodSlugs = Array.isArray(ind?.relatedProductSlugs) ? ind.relatedProductSlugs : [];
        if (prodSlugs.length > 0) {
          // lite 档：本页只取「相关产品」的名称与所属系列，不需要六语种正文与卖点
          fetch("/api/public/products?specs=3&lite=1")
            .then((r) => r.json())
            .then((pd) => {
              if (!alive) return;
              const tabs = pd?.data || pd || [];
              const bySlug: Record<string, RelatedProduct> = {};
              for (const tab of tabs) {
                for (const cat of tab.categories || []) {
                  for (const m of cat.models || []) {
                    if (prodSlugs.includes(m.id)) {
                      bySlug[m.id] = {
                        id: m.id,
                        name: m.name || m.model || "",
                        nameEn: m.nameEn || "",
                        nameJa: m.nameJa || "",
                        nameKo: m.nameKo || "",
                        nameFr: m.nameFr || "",
                        nameAr: m.nameAr || "",
                        model: m.model || "",
                        tabSlug: tab.id,
                        tabName: tab.name || "",
                        tabNameEn: tab.nameEn || "",
                        tabNameJa: tab.nameJa || "",
                        tabNameKo: tab.nameKo || "",
                        tabNameFr: tab.nameFr || "",
                        tabNameAr: tab.nameAr || "",
                        categoryName: cat.name || "",
                        categoryNameEn: cat.nameEn || "",
                        categoryNameJa: cat.nameJa || "",
                        categoryNameKo: cat.nameKo || "",
                        categoryNameFr: cat.nameFr || "",
                        categoryNameAr: cat.nameAr || "",
                      };
                    }
                  }
                }
              }
              setRelatedProducts(Object.values(bySlug));
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (alive) notFound();
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params.slug]);

  if (loading || !industry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  const hasSolutionFile = !!industry.solutionFile && industry.solutionFile !== "#";
  /**
   * 「解决方案」下载按钮的显示名（owner 2026-09-29 报障：多语种站点仍显示中文「解决方案」）
   * 两个原因：① 兜底文案把「解决方案」**写死中文**；
   *          ② `loc.get` 在该语种译文缺失时会**回退中文**，于是英文站显示中文文件名。
   * 口径：优先取**当前语种自己的**文件名（**不回退中文**）；没有就用
   *      「本地化行业名 + 本地化『解决方案』」（i18n 的 industrySolution）。
   */
  const fileNameSuffix = locale === "zh" ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);
  const ownLangSolutionName = String(
    (locale === "zh" ? industry.solutionFileName : (industry as any)[`solutionFileName${fileNameSuffix}`]) || ""
  ).trim();
  const solutionFileName = ownLangSolutionName || `${loc.get(industry, "name")} ${t("industrySolution") || "解决方案"}`;

  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
        <HeroBackground />
        <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />

        <div className="container relative">
          <Link href="/industries" className="inline-flex items-center gap-1 text-dark-300 hover:text-primary text-sm mb-6 transition-colors">
            <ChevronLeft size={16} />
            {t("backToIndustries")}
          </Link>
          <div className="w-16 h-1 bg-primary mb-6" />
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
            {loc.get(industry, "name")}
          </h1>
          {locale === "zh" && industry.nameEn && <p className="text-lg text-primary-200 font-medium mb-4">{industry.nameEn}</p>}
          <p className="text-xl text-dark-200 max-w-2xl">{loc.get(industry, "tagline")}</p>
        </div>
      </section>

      {/* Industry Overview */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-dark-900 border border-gray-700">
              <img
                src={getIndustryImage(industry)}
                alt={loc.get(industry, "name")}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <p className="text-lg font-semibold">{loc.get(industry, "name")}</p>
                {locale === "zh" && industry.nameEn && <p className="text-white/60 text-sm">{industry.nameEn}</p>}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-dark mb-4">{t("industryOverviewDetail")}</h2>
              <div
                className="text-dark-600 leading-relaxed mb-8 prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(loc.get(industry, "description")) }}
              />
              {industry.video && (
                <div className="mb-8">
                  <video
                    controls
                    className="w-full rounded-xl border border-dark-100 bg-black max-h-96"
                    preload="metadata"
                    poster={industry.image || undefined}
                  >
                    <source src={industry.video} />
                    {t("browserVideoNotSupported")}
                  </video>
                </div>
              )}

              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-primary" />
                {t("keyChallenges")}
              </h3>
              <ul className="space-y-3 mb-8">
                {loc.getArray(industry, "challenges")?.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </span>
                    <span className="text-dark-600">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-16 lg:py-20 bg-dark-50">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("ourSolutionsDetail")}</h2>
            <p className="text-dark-500 max-w-2xl mx-auto">{t("tailoredSolutionDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loc.getArray(industry, "solutions")?.map((sol, i) => (
              <div key={i} className="bg-white rounded-lg p-8 border border-dark-100 hover:border-primary hover:shadow-lg transition-all group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                  <Lightbulb size={24} className="text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors">{loc.get(sol, "title")}</h3>
                <p className="text-dark-500 text-sm leading-relaxed">{loc.get(sol, "desc")}</p>
              </div>
            ))}
          </div>
          {/* Solution download (opens after approval) */}
          <div className="mt-10 flex justify-center">
            <DownloadGateButton
              href={hasSolutionFile ? industry.solutionFile || "" : "#"}
              resourceName={solutionFileName}
              requireApproval={hasSolutionFile}
              approvalResource={{ type: "solution", key: industry.slug }}
              className="inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-600 px-8 py-3.5 rounded-lg font-medium transition-all"
            >
              <Download size={18} />
              {solutionFileName}
            </DownloadGateButton>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("relatedProducts")}</h2>
          </div>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.tabSlug}/${p.id}`}
                  className="group bg-dark-50 rounded-lg p-6 hover:bg-white hover:shadow-xl border border-transparent hover:border-primary transition-all"
                >
                  <div className="text-xs text-dark-400 mb-2">
                    {loc.get(p, "tabName")} / {loc.get(p, "categoryName")}
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">
                    {loc.get(p, "name")}
                  </h3>
                  {p.model && <div className="text-sm text-dark-500 mb-3">{p.model}</div>}
                  <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                    {t("learnMoreAboutUs")}
                    <ArrowRight size={14} className="rtl-flip" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {loc.getArray(industry, "products")?.map((p, i) => (
                <span key={i} className="px-6 py-3 bg-dark-50 border border-dark-100 rounded-lg text-dark-700 font-medium hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cases */}
      {loc.getArray(industry, "cases")?.length > 0 && (
        <section className="py-16 lg:py-20 bg-dark-50">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-block w-12 h-1 bg-primary mb-4" />
              <h2 className="text-3xl font-bold text-dark mb-4">{t("successCases")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {loc.getArray(industry, "cases").map((c, i) => (
                <div key={i} className="bg-white rounded-lg p-8 border border-dark-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <h3 className="text-lg font-bold text-dark">{loc.get(c, "title")}</h3>
                  </div>
                  <p className="text-dark-500 text-sm leading-relaxed">{loc.get(c, "desc")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Industries */}
      {relatedIndustries.length > 0 && (
        <section className="py-16 lg:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-block w-12 h-1 bg-primary mb-4" />
              <h2 className="text-3xl font-bold text-dark mb-4">{t("exploreOtherIndustries")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedIndustries.map((ri) => (
                <Link key={ri.id} href={`/industries/${ri.slug}`} className="group bg-dark-50 rounded-lg p-8 hover:bg-white hover:shadow-xl border border-transparent hover:border-primary transition-all">
                  <h3 className="text-xl font-bold text-dark mb-2 group-hover:text-primary transition-colors">{loc.get(ri, "name")}</h3>
                  <p className="text-dark-500 text-sm mb-4 line-clamp-2">{loc.get(ri, "tagline")}</p>
                  <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                    {t("learnMoreAboutUs")}
                    <ArrowRight size={14} className="rtl-flip" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("needCustomSolution")}</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">{t("contactIndustryDesc")}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all">
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}
