"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { getAboutSection, aboutSections } from "@/lib/about";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import UnilokPageHero from "./PageHero";

interface PageProps {
  params: { section: string };
}

/** 认证过滤：必须有名称字段且 name/nameEn 非纯空白（与默认实现一致） */
function filterCertifications(certs: any[]): any[] {
  if (!Array.isArray(certs)) return [];
  return certs.filter(
    (c: any) =>
      (c?.name || c?.nameEn || c?.nameJa || c?.nameKo || c?.nameFr || c?.nameAr) &&
      String(c.name || c.nameEn || "").trim() !== ""
  );
}

/**
 * UNILOK 精密工业风 · 关于分页（company profile / culture / history / honors）
 * 数据获取与 content 多形态兼容逻辑完全照搬默认 AboutSectionClient，仅渲染为 UNILOK 风
 */
export default function UnilokAboutSectionPage({ params }: PageProps) {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [section, setSection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 优先从API获取数据，失败时回退到硬编码数据
  useEffect(() => {
    let cancelled = false;
    const fetchSection = async () => {
      try {
        const res = await fetch(`/api/public/about?slug=${params.section}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && data.slug) {
            setSection(data);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn("从API获取关于我们数据失败，使用硬编码数据:", error);
      }
      // 回退到硬编码数据
      if (!cancelled) {
        const staticSection = getAboutSection(params.section);
        setSection(staticSection || null);
        setLoading(false);
      }
    };
    fetchSection();
    return () => {
      cancelled = true;
    };
  }, [params.section]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <span className="text-dark-400">{t("loading")}</span>
      </div>
    );
  }

  if (!section) notFound();

  const certifications = filterCertifications(section.certifications);

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowAbout")}
        title={loc.get(section, "title")}
        subtitle={loc.get(section, "subtitle")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("about"), href: "/about" },
          { label: loc.get(section, "title") },
        ]}
      />

      {/* Content Sections */}
      {section.content && section.content.length > 0 && (
        <section className="bg-white py-14 lg:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl space-y-12">
              {(() => {
                // 基础 content 数组（zh/en 混合块存储，带 lang 字段）
                const baseContent = section.content || [];
                const renderBlocks = (blocks: any[]) =>
                  blocks.map((block: any, i: number) => {
                    // 兼容硬编码 fallback 结构（lib/about.ts）：heading/paragraphs + headingEn/Ja/Ko/Fr/Ar + paragraphsEn/Ja/Ko/Fr/Ar
                    const sfx =
                      locale === "zh"
                        ? ""
                        : locale.charAt(0).toUpperCase() + locale.slice(1);
                    const heading = (sfx && block[`heading${sfx}`]) || block.heading || "";
                    const paras = (sfx && block[`paragraphs${sfx}`]) || block.paragraphs || [];
                    return (
                      <div key={i}>
                        <div className="mb-4 flex items-center gap-3">
                          <span className="h-0.5 w-8 bg-accent" />
                          <h2 className="text-2xl font-bold text-dark">{heading}</h2>
                        </div>
                        <div className="space-y-4">
                          {(paras || []).map((p: string, j: number) => (
                            <p key={j} className="leading-relaxed text-dark-600">
                              {p}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  });
                const hasLangField = baseContent.some((block: any) => block.lang);
                if (hasLangField) {
                  // 1) 优先：基础数组中当前语言块（zh/en 直接命中，且避免脏 contentEn 重复块）
                  const currentLangBlocks = baseContent.filter(
                    (block: any) => block.lang === locale
                  );
                  if (currentLangBlocks.length > 0) {
                    return renderBlocks(currentLangBlocks);
                  }
                  // 2) 回退：后缀列（contentJa/contentKo/contentFr/contentAr）——内容已是该语言译文，按 blockId 去重（历史数据有 zh/en 重复块）
                  const suffixRaw = loc.getArray(section, "content");
                  const seen = new Set<string>();
                  const suffixBlocks = suffixRaw.filter((b: any) => {
                    if (!b || typeof b !== "object") return false;
                    const key = b.blockId || `${b.heading}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  if (suffixBlocks.length > 0) {
                    return renderBlocks(suffixBlocks);
                  }
                  // 3) 兜底：中文
                  return renderBlocks(
                    baseContent.filter((block: any) => block.lang === "zh" || !block.lang)
                  );
                }
                // 旧数据：无 lang 字段，按后缀列（contentEn/contentJa…）取当前语言
                const langBlocks = loc.getArray(section, "content");
                if (langBlocks.length > 0) {
                  return renderBlocks(langBlocks);
                }
                return renderBlocks(section.content || []);
              })()}
            </div>

            {/* Highlights */}
            {section.highlights && section.highlights.length > 0 && (
              <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
                {section.highlights.map((h: any, i: number) => (
                  <div
                    key={i}
                    className="border border-gray-200 bg-white p-5 text-center transition-colors hover:border-accent sm:p-6"
                  >
                    <div className="mb-1 text-lg font-bold leading-snug text-primary sm:text-xl">
                      {loc.get(h, "value")}
                    </div>
                    <div className="text-sm text-dark-500">{loc.get(h, "label")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Timeline */}
      {section.timeline && section.timeline.length > 0 && (
        <section className="border-y border-gray-200 bg-dark-50 py-14 lg:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 flex items-center gap-3">
                <span className="h-0.5 w-8 bg-accent" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {t("ourHistory")}
                </span>
              </div>
              <div className="relative">
                <div className="absolute start-4 top-0 bottom-0 w-0.5 bg-gray-200 md:start-1/2 md:-translate-x-1/2" />
                <div className="space-y-8">
                  {section.timeline.map((item: any, i: number) => (
                    <div
                      key={i}
                      className={`relative flex items-start gap-6 ${
                        i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                      }`}
                    >
                      <div className="absolute start-4 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-accent md:start-1/2" />
                      <div
                        className={`ms-12 md:ms-0 md:w-1/2 ${
                          i % 2 === 0 ? "md:pe-12 md:text-end" : "md:ps-12"
                        }`}
                      >
                        <div className="border border-gray-200 bg-white p-6 transition-colors hover:border-accent">
                          <div className="mb-1 text-2xl font-bold text-accent">
                            {item.year}
                          </div>
                          <h3 className="mb-2 text-lg font-bold text-dark">
                            {loc.get(item, "title")}
                          </h3>
                          <p className="text-sm text-dark-500">{loc.get(item, "desc")}</p>
                        </div>
                      </div>
                      <div className="hidden md:block md:w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section className="bg-white py-14 lg:py-20">
          <div className="container">
            <div className="mb-10 flex items-center gap-3">
              <span className="h-0.5 w-8 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {t("ourHonors")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert: any, i: number) => {
                const certName = loc.get(cert, "name");
                const certIssuer = loc.get(cert, "issuer");
                const certYear = cert?.year;
                return (
                  <div
                    key={i}
                    className="border border-gray-200 bg-white p-6 transition-colors hover:border-accent"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center border border-accent">
                      <Award size={22} className="text-accent" />
                    </div>
                    {certName && <h3 className="mb-2 text-lg font-bold text-dark">{certName}</h3>}
                    {certIssuer && <p className="mb-2 text-sm text-dark-500">{certIssuer}</p>}
                    {certYear && <p className="text-sm font-medium text-primary">{certYear}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sub Navigation */}
      <section className="border-t border-gray-200 bg-white py-12">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-3">
            {aboutSections.map((s) => (
              <Link
                key={s.slug}
                href={`/about/${s.slug}`}
                className={`border px-5 py-2 text-sm font-medium transition-colors ${
                  s.slug === section.slug
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-dark-600 hover:border-accent hover:text-accent"
                }`}
              >
                {loc.get(s, "title")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white lg:text-3xl">
            {t("wantLearnMore")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-white/80">{t("contactAboutInfo")}</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-dark-50"
          >
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}
