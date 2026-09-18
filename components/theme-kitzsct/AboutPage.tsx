"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Building2, Eye, Heart, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import KitzPageHero from "./PageHero";

// 核心价值观图标：数据没有图标字段，按序号循环取，保证任意条数都不越界
const valueIcons = [Target, Eye, Heart, Award];

/**
 * KITZ SCT 日式工业风 · 关于页
 *
 * 数据源与 UNILOK 对应件一致：GET /api/public/about（**裸数组**，不带 slug）。
 * 多语言：内容块与列表一律经 createLocalizedGetter 取当前语种，
 * 不读 name/nameEn 之类原始字段（否则非中文站会出现中文残留）。
 * 页面拆为「公司简介 / 核心价值观 / 发展历程」三段，任一段无数据即整段不渲染。
 */
export default function KitzAboutPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadSections = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch("/api/public/about", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        // 形状不符按失败处理，避免把「接口出错」伪装成「暂无内容」
        if (Array.isArray(data)) setSections(data);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // 三个固定板块按 slug 定位（与后台板块 slug 约定一致）
  const profile = sections.find((s) => s.slug === "profile");
  const culture = sections.find((s) => s.slug === "culture");
  const history = sections.find((s) => s.slug === "history");

  // 简介段落：先取当前语种的内容块数组，再在块内取当前语种的 paragraphs
  // （逐层 loc.getArray —— 只切换一次 locale 就够，无需手写语言分支）
  const profileBlocks = loc.getArray(profile, "content");
  const profileParagraphs: string[] =
    (profileBlocks[0] && loc.getArray(profileBlocks[0], "paragraphs")) || [];

  const values: any[] = loc.getArray(culture, "highlights");
  const milestones: any[] = loc.getArray(history, "timeline");

  const hasProfile = Boolean(profile);
  const hasAnyContent =
    hasProfile || values.length > 0 || milestones.length > 0;

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowAbout")}
        title={t("about")}
        subtitle={t("kitzAboutIntro")}
        breadcrumb={[{ label: t("home"), href: "/" }, { label: t("about") }]}
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center bg-white">
          <span className="text-sm text-dark-400">{t("loading")}</span>
        </div>
      ) : failed ? (
        <div className="container py-24">
          <div className="border border-gray-200 py-20 text-center">
            <p className="mb-6 text-sm text-dark-500">{t("kitzLoadFailed")}</p>
            <button
              type="button"
              onClick={loadSections}
              className="border border-dark px-6 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-dark hover:text-white"
            >
              {t("kitzRetry")}
            </button>
          </div>
        </div>
      ) : !hasAnyContent ? (
        <div className="container py-24">
          <p className="border border-dashed border-gray-200 py-24 text-center text-sm text-dark-400">
            {t("kitzNoContent")}
          </p>
        </div>
      ) : (
        <>
          {/* 公司简介：方形图 + 段落 + 数据栏（细线分隔，KITZ 不用卡片阴影） */}
          {hasProfile && (
            <section className="bg-white py-16 lg:py-24">
              <div className="container">
                <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-2">
                  {/* 图：无图时用中性占位（不引入任何品牌素材） */}
                  <div className="relative aspect-square overflow-hidden border border-gray-200 bg-dark-50">
                    {profile.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.image}
                        alt={loc.get(profile, "title")}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Building2 size={72} className="text-dark-200" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-2 w-2 bg-primary" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-dark-400">
                        {t("companyProfile")}
                      </span>
                    </div>
                    <h2 className="mb-6 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
                      {loc.get(profile, "title") || t("companyProfile")}
                    </h2>
                    {profileParagraphs.length > 0 ? (
                      profileParagraphs.map((p: string, i: number) => (
                        <p
                          key={i}
                          className="mb-4 text-sm leading-relaxed text-dark-600"
                        >
                          {p}
                        </p>
                      ))
                    ) : (
                      <p className="mb-4 text-sm leading-relaxed text-dark-600">
                        {loc.get(profile, "subtitle")}
                      </p>
                    )}

                    {/* 数据栏：三格，左侧细线分隔 */}
                    <div className="mt-10 grid grid-cols-3 gap-6 border-t border-gray-200 pt-8">
                      <div>
                        <div className="mb-1 text-2xl font-bold tabular-nums text-dark">
                          {t("aboutStatYears")}
                        </div>
                        <div className="text-xs tracking-wide text-dark-400">
                          {t("yearsExperience")}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-2xl font-bold tabular-nums text-dark">
                          {t("aboutStatClients")}
                        </div>
                        <div className="text-xs tracking-wide text-dark-400">
                          {t("globalClients")}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-2xl font-bold tabular-nums text-dark">
                          {t("aboutStatPatents")}
                        </div>
                        <div className="text-xs tracking-wide text-dark-400">
                          {t("techPatents")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 核心价值观：四格，方框 + 左对齐（刻意不居中，符合日式工业排版） */}
          {values.length > 0 && (
            <section className="border-y border-gray-200 bg-dark-50 py-16 lg:py-24">
              <div className="container">
                <div className="mb-12 border-b border-dark pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                    {t("companyCulture")}
                  </h2>
                  <p className="mt-2 text-sm text-dark-500">
                    {t("coreValuesDesc")}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {values.map((v, i) => {
                    const Icon = valueIcons[i % valueIcons.length];
                    return (
                      <div
                        key={i}
                        className="border border-gray-200 bg-white p-8 transition-colors hover:border-dark"
                      >
                        <div className="mb-5 flex h-10 w-10 items-center justify-center border border-gray-200">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <h3 className="mb-3 text-base font-bold tracking-tight text-dark">
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

          {/* 发展历程：单列竖向时间线（细线 + 方块节点，比双列更接近图纸感） */}
          {milestones.length > 0 && (
            <section className="bg-white py-16 lg:py-24">
              <div className="container">
                <div className="mb-12 border-b border-dark pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                    {t("ourHistory")}
                  </h2>
                  <p className="mt-2 text-sm text-dark-500">
                    {t("historyDesc")}
                  </p>
                </div>
                <div className="relative mx-auto max-w-3xl">
                  <div className="absolute start-[7px] top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-10">
                    {milestones.map((item, index) => (
                      <div key={item.year || index} className="relative ps-10">
                        <span className="absolute start-0 top-1.5 h-3.5 w-3.5 border-2 border-white bg-primary" />
                        <div className="mb-1 text-xl font-bold tabular-nums tracking-wide text-dark">
                          {item.year}
                        </div>
                        <h3 className="mb-2 text-base font-bold tracking-tight text-dark">
                          {loc.get(item, "title")}
                        </h3>
                        <p className="text-sm leading-relaxed text-dark-500">
                          {loc.get(item, "desc")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* CTA：细线框 */}
          <section className="bg-white py-16 lg:py-20">
            <div className="container">
              <div className="border border-gray-200 p-10 text-center lg:p-14">
                <h2 className="mb-4 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
                  {t("wantLearnMore")}
                </h2>
                <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-dark-500">
                  {t("contactTeamInfo")}
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
                >
                  {t("contactUs")}
                  <ArrowRight size={16} className="rtl-flip" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
