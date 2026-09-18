"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { ArrowLeft, ArrowRight, CheckCircle, Settings, Microwave, Wrench, Headphones, FlaskConical, ShieldCheck, Phone, Mail, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import DownloadGateButton from "@/components/ui/DownloadGateButton";
import { getContactEmail, getContactPhone } from "@/lib/brand";

const iconMap: Record<string, any> = {
  Settings,
  Microwave,
  Wrench,
  Headphones,
  FlaskConical,
  ShieldCheck,
};

interface RelatedService {
  slug: string;
  title: string;
  subtitle: string;
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

export default function ServiceDetailClient() {
  const params = useParams();
  const slug = params.slug as string;
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contactData, setContactData] = useState<any>(null);
  const [relatedServices, setRelatedServices] = useState<RelatedService[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/public/services/${slug}`),
      fetch("/api/public/services"),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) throw new Error("not found");
        const data = await r1.json();
        const all = await r2.json();
        if (!alive) return;
        setService(data);
        // 相关服务：后台配置优先，未配置自动推荐其他服务
        const list = Array.isArray(all) ? all : [];
        const relIds = Array.isArray(data?.relatedServiceSlugs) ? data.relatedServiceSlugs : [];
        const rec =
          relIds.length > 0
            ? relIds.map((s: string) => list.find((x: any) => x.slug === s)).filter(Boolean)
            : list.filter((x: any) => x.slug !== slug).slice(0, 3);
        setRelatedServices(rec.map((x: any) => ({ ...x })));
        // 相关产品：后台配置了推荐产品时按 slug 关联真实产品
        const prodSlugs = Array.isArray(data?.relatedProductSlugs) ? data.relatedProductSlugs : [];
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
        if (alive) setService(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    fetch("/api/public/site-config?key=contact_info")
      .then((r) => r.json())
      .then((data) => setContactData(data.data))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("serviceNotFound")}</h1>
        <Link href="/services" className="text-red-600 hover:underline">
          {t("backToServices")}
        </Link>
      </div>
    );
  }

  const title = loc.get(service, "title");
  const subtitle = loc.get(service, "subtitle");
  const description = loc.get(service, "description");
  const features = loc.getArray(service, "features");
  const process = loc.getArray(service, "process");
  const IconComponent = iconMap[service.icon] || Settings;
  const hasSolutionFile = !!service.solutionFile && service.solutionFile !== "#";
  const solutionFileName = loc.get(service, "solutionFileName") || `${title} 服务方案`;

  // 联系方式：DB contact_info 优先，兜底取部署级 env；两者皆空时不渲染该项（不留 tel:/mailto: 空链接）
  const phone = String(contactData?.phone || getContactPhone()).trim();
  const email = String(contactData?.email || getContactEmail()).trim();

  return (
    <>
      <PageHero
        title={title}
        titleEn={loc.get(service, "titleEn") || loc.get(service, "title")}
        subtitle={subtitle}
        subtitleEn={loc.get(service, "subtitleEn") || loc.get(service, "subtitle")}
        breadcrumb={title}
        breadcrumbEn={loc.get(service, "titleEn") || loc.get(service, "title")}
      />

      {/* 服务概述 */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center">
                  <IconComponent size={32} className="text-red-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  <p className="text-gray-500 mt-1">{subtitle}</p>
                </div>
              </div>
              <div
                className="prose prose-lg max-w-none text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: description }}
              />
              {service.video && (
                <div className="mt-8">
                  <video
                    controls
                    className="w-full rounded-xl border border-dark-100 bg-black max-h-96"
                    preload="metadata"
                  >
                    <source src={service.video} />
                    {t("browserVideoNotSupported")}
                  </video>
                </div>
              )}
            </div>

            {/* 侧边联系卡片 */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("needHelpTitle")}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t("needHelpDesc")}
                </p>
                <div className="space-y-3">
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Phone size={20} className="text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">{t("phone")}</p>
                        <p className="text-sm font-medium text-gray-900"><bdi dir="ltr">{phone}</bdi></p>
                      </div>
                    </a>
                  )}
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Mail size={20} className="text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">{t("email")}</p>
                        <p className="text-sm font-medium text-gray-900"><bdi dir="ltr">{email}</bdi></p>
                      </div>
                    </a>
                  )}
                </div>
                <Link
                  href="/contact"
                  className="block w-full text-center mt-6 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  {t("ctaButton")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 服务特性 */}
      {features.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">
                {t("serviceFeatures")}
              </h2>
              <p className="text-gray-500 mt-3">
                {t("serviceGuarantee")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature: any, index: number) => {
                // features 可能是字符串数组或对象数组
                const isString = typeof feature === "string";
                const featTitle = isString ? feature : (loc.get(feature, "title") || loc.get(feature, "name"));
                const featDesc = isString ? "" : (loc.get(feature, "desc") || loc.get(feature, "description"));
                if (!featTitle || String(featTitle).trim() === "") return null;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {featTitle}
                        </h3>
                        {featDesc && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {featDesc}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 服务流程 */}
      {process.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">
                {t("serviceProcess")}
              </h2>
              <p className="text-gray-500 mt-3">
                {t("serviceProcessDesc")}
              </p>
            </div>
            <div className="relative">
              {/* 连接线 */}
              <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200 hidden md:block" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {process.filter((step: any) => {
                  const t = typeof step === "string" ? step : (step?.title || step?.name || "");
                  return t && String(t).trim() !== "";
                }).map((step: any, index: number) => {
                  const stepTitle = typeof step === "string" ? step : (loc.get(step, "title") || loc.get(step, "name"));
                  const stepDesc = typeof step === "string" ? "" : (loc.get(step, "desc") || loc.get(step, "description"));
                  return (
                  <div key={index} className="relative text-center">
                    <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-xl font-bold">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {stepTitle}
                    </h3>
                    {stepDesc && <p className="text-sm text-gray-600">{stepDesc}</p>}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 服务方案下载（后台确认留资后开放） */}
      {hasSolutionFile && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-block w-12 h-1 bg-red-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("download")}</h2>
            <DownloadGateButton
              href={service.solutionFile || "#"}
              resourceName={solutionFileName}
              requireApproval={true}
              approvalResource={{ type: "service", key: slug }}
              className="inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-8 py-3.5 rounded-lg font-medium transition-all"
            >
              <Download size={18} />
              {solutionFileName}
            </DownloadGateButton>
            <p className="text-sm text-gray-400 mt-4">{t("downloadVerifyDesc")}</p>
          </div>
        </section>
      )}

      {/* 相关服务 */}
      {relatedServices.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block w-12 h-1 bg-red-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900">{t("relatedServices")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedServices.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group bg-gray-50 rounded-lg p-6 hover:bg-white hover:shadow-xl border border-transparent hover:border-red-200 transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                    {loc.get(s, "title")}
                  </h3>
                  {loc.get(s, "subtitle") && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{loc.get(s, "subtitle")}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium group-hover:gap-2 transition-all">
                    {t("learnMoreAboutUs")}
                    <ArrowRight size={14} className="rtl-flip" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 相关产品 */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-block w-12 h-1 bg-red-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900">{t("relatedProducts")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.tabSlug}/${p.id}`}
                  className="group bg-white rounded-lg p-6 hover:bg-white hover:shadow-xl border border-transparent hover:border-red-200 transition-all"
                >
                  <div className="text-xs text-gray-400 mb-2">
                    {loc.get(p, "tabName")} / {loc.get(p, "categoryName")}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                    {loc.get(p, "name")}
                  </h3>
                  {p.model && <div className="text-sm text-gray-500 mb-3">{p.model}</div>}
                  <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium group-hover:gap-2 transition-all">
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
      <section className="py-16 bg-gradient-to-r from-red-600 to-red-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("readyToStart")}
          </h2>
          <p className="text-red-100 mb-8 text-lg">
            {t("needHelpDesc")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              {t("ctaButton")}
            </Link>
            <Link
              href="/services"
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
            >
              {t("allServices")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
