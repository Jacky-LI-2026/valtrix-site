"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, Target, Eye, Heart, Award, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

interface AboutSection {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  image?: string;
  content: { heading: string; headingEn: string; paragraphs: string[]; paragraphsEn: string[] }[];
  highlights?: { label: string; labelEn: string; value: string; valueEn: string }[];
  timeline?: { year: string; title: string; titleEn: string; desc: string; descEn: string }[];
  certifications?: { name: string; nameEn: string; issuer: string; issuerEn: string; year: string }[];
}

const defaultValues = [
  { icon: Target, title: "创新驱动", titleEn: "Innovation-Driven", desc: "以技术创新为核心，持续投入研发，引领行业发展", descEn: "Technology innovation at core, continuous R&D investment, industry leadership" },
  { icon: Eye, title: "标准引领", titleEn: "Standard-Led", desc: "建立严格的质量标准，以高标准要求每一个产品", descEn: "Strict quality standards, high requirements for every product" },
  { icon: Heart, title: "客户至上", titleEn: "Customer First", desc: "深入理解客户需求，提供超越期望的产品和服务", descEn: "Deep understanding of customer needs, products and services beyond expectations" },
  { icon: Award, title: "品质第一", titleEn: "Quality First", desc: "从原材料到成品，全流程质量管控，确保卓越品质", descEn: "Full-process quality control from raw materials to finished products" },
];

export default function AboutDefaultClient() {
  const { t, locale } = useI18n();
    const loc = createLocalizedGetter(locale);
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageConfig, setPageConfig] = useState<any>(null);

  useEffect(() => {
    // 获取页面配置
    fetch("/api/public/page-config?page=about")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setPageConfig(data.data);
        }
      })
      .catch(() => {});

    // 获取关于我们内容
    fetch("/api/public/about")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSections(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profile = sections.find((s) => s.slug === "profile");
  const culture = sections.find((s) => s.slug === "culture");
  const history = sections.find((s) => s.slug === "history");
  const honors = sections.find((s) => s.slug === "honors");

  const milestones = history?.timeline || [];
  const values = culture?.highlights?.map((h: any, i) => ({
    icon: defaultValues[i % defaultValues.length].icon,
    title: h.label,
    titleEn: h.labelEn,
    titleJa: h.labelJa,
    titleKo: h.labelKo,
    titleFr: h.labelFr,
    titleAr: h.labelAr,
    desc: h.value,
    descEn: h.valueEn,
    descJa: h.valueJa,
    descKo: h.valueKo,
    descFr: h.valueFr,
    descAr: h.valueAr,
  })) || defaultValues;

  const profileParagraphs = loc.getArray(profile, "content")?.[0]?.paragraphs || [];

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
        title={pageConfig?.title || t("about")}
        titleEn={pageConfig?.titleEn || "About VALTRIX"}
        subtitle={pageConfig?.subtitle || t("aboutPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Focused on semiconductor fluid control core products, integrated R&D, manufacturing, sales and service"}
        breadcrumb={pageConfig?.breadcrumb || t("about")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "About"}
      />

      {/* Company Profile */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-dark-800 to-primary-900 flex items-center justify-center relative overflow-hidden">
              {profile?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.image} alt={loc.get(profile, "title")} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }} />
                  <Building2 size={80} className="text-white/20 relative z-10" />
                </>
              )}
            </div>
            <div>
              <div className="w-12 h-1 bg-primary mb-6" />
              <h2 className="text-3xl font-bold text-dark mb-6">{t("companyProfile")}</h2>
              {profileParagraphs.length > 0 ? (
                profileParagraphs.map((p: string, i: number) => (
                  <p key={i} className="text-dark-600 leading-relaxed mb-4">
                    {p}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-dark-600 leading-relaxed mb-4">
                    VALTRIX是一家专业从事工业阀门与精密流体控制元件研发、生产、销售与服务的高新技术企业。
                  </p>
                </>
              )}
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">15+</div>
                  <div className="text-dark-500 text-sm">{t("yearsExperience")}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">500+</div>
                  <div className="text-dark-500 text-sm">{t("globalClients")}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">100+</div>
                  <div className="text-dark-500 text-sm">{t("techPatents")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="py-16 lg:py-20 bg-dark-50">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("companyCulture")}</h2>
            <p className="text-dark-500">{t("coreValuesDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-lg p-8 text-center hover:shadow-lg transition-all">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Icon size={28} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-3">{loc.get(item, "title")}</h3>
                  <p className="text-dark-500 text-sm leading-relaxed">{loc.get(item, "desc")}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Milestones */}
      {milestones.length > 0 && (
        <section className="py-16 lg:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-block w-12 h-1 bg-primary mb-4" />
              <h2 className="text-3xl font-bold text-dark mb-4">{t("ourHistory")}</h2>
              <p className="text-dark-500">{t("historyDesc")}</p>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-dark-100 -translate-x-1/2" />
              <div className="space-y-8 lg:space-y-0">
                {milestones.map((item, index) => (
                  <div key={item.year} className={`relative lg:flex items-center ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                    <div className="lg:w-1/2 lg:px-8">
                      <div className={`bg-white border border-dark-100 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all ${index % 2 === 0 ? "lg:text-right" : ""}`}>
                        <div className="text-2xl font-bold text-primary mb-2">{item.year}</div>
                        <h3 className="text-lg font-bold text-dark mb-2">{loc.get(item, "title")}</h3>
                        <p className="text-dark-500 text-sm">{loc.get(item, "desc")}</p>
                      </div>
                    </div>
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-white" />
                    <div className="lg:w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Navigation */}
      <section className="py-16 lg:py-20 bg-dark-50">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("learnMoreAboutUs")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { slug: "profile", label: "公司简介", labelEn: "Company", labelJa: "会社概要", labelKo: "회사 소개", labelFr: "Profil de l'entreprise", labelAr: "نبذة عن الشركة", desc: "企业概况与使命愿景", descEn: "Overview & Mission", descJa: "会社概要とミッションビジョン", descKo: "기업 개요 및 미션 비전", descFr: "Profil de l'entreprise et mission Vision", descAr: "نبذة عن الشركة ورؤية المهمة" },
              { slug: "culture", label: "企业文化", labelEn: "Culture", labelJa: "企業文化", labelKo: "기업 문화", labelFr: "Culture d'entreprise", labelAr: "ثقافة الشركات", desc: "核心价值观与理念", descEn: "Core Values", descJa: "コアバリューとコンセプト", descKo: "핵심 가치 및 철학", descFr: "Valeurs et concepts fondamentaux", descAr: "القيم والمفاهيم الأساسية" },
              { slug: "history", label: "发展历程", labelEn: "History", labelJa: "発展の歴史", labelKo: "개발 과정", labelFr: "Historique du développement", labelAr: "تاريخ التطوير", desc: "成长足迹", descEn: "Journey", descJa: "成長の足跡", descKo: "성장 발자국", descFr: "Empreinte de croissance", descAr: "بصمة النمو" },
              { slug: "honors", label: "资质荣誉", labelEn: "Honors", labelJa: "資質と栄誉", labelKo: "자격 명예", labelFr: "Qualifications et distinctions", labelAr: "المؤهلات والأوسمة", desc: "权威认证与专利", descEn: "Certs & Patents", descJa: "権威ある認証と特許", descKo: "권위 있는 인증 및 특허", descFr: "Certifications faisant autorité et brevets", descAr: "الشهادات الرسمية وبراءات الاختراع" },
            ].map((item) => (
              <Link
                key={item.slug}
                href={`/about/${item.slug}`}
                className="group bg-white rounded-lg p-6 text-center border border-dark-100 hover:border-primary hover:shadow-lg transition-all"
              >
                <h3 className="font-bold text-dark mb-1 group-hover:text-primary transition-colors">{loc.get(item, "label")}</h3>
                <p className="text-xs text-dark-400">{loc.get(item, "desc")}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("wantLearnMore")}</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">{t("contactTeamInfo")}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all">
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}
