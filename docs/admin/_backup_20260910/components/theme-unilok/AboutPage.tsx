"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Building2, Eye, Heart, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import UnilokPageHero from "./PageHero";

const valueIcons = [Target, Eye, Heart, Award];

/**
 * UNILOK 精密工业风 · 关于页
 * PageHero + 公司简介 + 核心价值观 + 发展历程 + CTA
 */
export default function UnilokAboutPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/about")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSections(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profile = sections.find((s) => s.slug === "profile");
  const culture = sections.find((s) => s.slug === "culture");
  const history = sections.find((s) => s.slug === "history");

  const profileParagraphs: string[] =
    loc.getArray(profile, "content")?.[0]?.paragraphs || [];
  const values: any[] = culture?.highlights || [];
  const milestones: any[] = history?.timeline || [];

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowAbout")}
        title={t("about")}
        subtitle={t("unilokAboutIntro")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("about") },
        ]}
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center bg-white">
          <span className="text-dark-400">{t("loading")}</span>
        </div>
      ) : (
        <>
          {/* 公司简介 */}
          <section className="bg-white py-16 lg:py-24">
            <div className="container">
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                {/* 图片 */}
                <div className="relative aspect-[4/3] overflow-hidden border border-gray-200 bg-dark-50">
                  {profile?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.image}
                      alt={loc.get(profile, "title")}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-dark-800 to-primary-900">
                      <Building2 size={80} className="text-white/20" />
                    </div>
                  )}
                  <span className="pointer-events-none absolute top-0 start-0 h-14 w-14 border-s-2 border-t-2 border-accent" />
                  <span className="pointer-events-none absolute bottom-0 end-0 h-14 w-14 border-b-2 border-e-2 border-accent/50" />
                </div>

                {/* 文案 */}
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-0.5 w-8 bg-accent" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      {t("companyProfile")}
                    </span>
                  </div>
                  <h2 className="mb-6 text-3xl font-bold text-dark">
                    {loc.get(profile, "title") || t("companyProfile")}
                  </h2>
                  {profileParagraphs.length > 0 ? (
                    profileParagraphs.map((p: string, i: number) => (
                      <p key={i} className="mb-4 leading-relaxed text-dark-600">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="mb-4 leading-relaxed text-dark-600">
                      {loc.get(profile, "subtitle")}
                    </p>
                  )}
                  {/* 数据统计 */}
                  <div className="mt-8 grid grid-cols-3 gap-6 border-t border-gray-100 pt-8">
                    <div>
                      <div className="mb-1 text-3xl font-bold text-primary">15+</div>
                      <div className="text-sm text-dark-500">
                        {t("yearsExperience")}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-3xl font-bold text-primary">500+</div>
                      <div className="text-sm text-dark-500">
                        {t("globalClients")}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-3xl font-bold text-primary">100+</div>
                      <div className="text-sm text-dark-500">
                        {t("techPatents")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 核心价值观 */}
          {values.length > 0 && (
            <section className="border-y border-gray-200 bg-dark-50 py-16 lg:py-24">
              <div className="container">
                <div className="mb-14 text-center">
                  <div className="mb-4 inline-flex items-center gap-3">
                    <span className="h-0.5 w-8 bg-accent" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      {t("companyCulture")}
                    </span>
                    <span className="h-0.5 w-8 bg-accent" />
                  </div>
                  <h2 className="text-3xl font-bold text-dark">{t("companyCulture")}</h2>
                  <p className="mt-3 text-dark-500">{t("coreValuesDesc")}</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {values.map((v, i) => {
                    const Icon = valueIcons[i % valueIcons.length];
                    return (
                      <div
                        key={i}
                        className="border border-gray-200 bg-white p-8 transition-colors hover:border-accent"
                      >
                        <div className="mb-5 flex h-12 w-12 items-center justify-center border border-accent">
                          <Icon size={22} className="text-accent" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-dark">
                          {loc.get(v, "label")}
                        </h3>
                        <p className="text-sm leading-relaxed text-dark-500">
                          {loc.get(v, "value")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 发展历程 */}
          {milestones.length > 0 && (
            <section className="bg-white py-16 lg:py-24">
              <div className="container">
                <div className="mb-14 text-center">
                  <div className="mb-4 inline-flex items-center gap-3">
                    <span className="h-0.5 w-8 bg-accent" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      {t("ourHistory")}
                    </span>
                    <span className="h-0.5 w-8 bg-accent" />
                  </div>
                  <h2 className="text-3xl font-bold text-dark">{t("ourHistory")}</h2>
                  <p className="mt-3 text-dark-500">{t("historyDesc")}</p>
                </div>
                <div className="relative">
                  <div className="absolute start-1/2 top-0 bottom-0 hidden w-0.5 -translate-x-1/2 bg-gray-200 lg:block" />
                  <div className="space-y-8 lg:space-y-0">
                    {milestones.map((item, index) => (
                      <div
                        key={item.year}
                        className={`relative lg:flex lg:items-center ${
                          index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                        }`}
                      >
                        <div className="lg:w-1/2 lg:px-8">
                          <div
                            className={`border border-gray-200 bg-white p-6 transition-colors hover:border-accent ${
                              index % 2 === 0 ? "lg:text-end" : ""
                            }`}
                          >
                            <div className="mb-2 text-2xl font-bold text-accent">
                              {item.year}
                            </div>
                            <h3 className="mb-2 text-lg font-bold text-dark">
                              {loc.get(item, "title")}
                            </h3>
                            <p className="text-sm text-dark-500">
                              {loc.get(item, "desc")}
                            </p>
                          </div>
                        </div>
                        <div className="absolute start-1/2 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-accent lg:block" />
                        <div className="lg:w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="bg-primary py-16">
            <div className="container text-center">
              <h2 className="mb-4 text-2xl font-bold text-white lg:text-3xl">
                {t("wantLearnMore")}
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-white/80">
                {t("contactTeamInfo")}
              </p>
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
      )}
    </>
  );
}
