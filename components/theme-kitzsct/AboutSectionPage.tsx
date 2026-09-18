"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import KitzPageHero from "./PageHero";

/**
 * 派发页把 props.params 原样透传，故形状必须与派发页一致（不得改成 props.section）。
 */
interface PageProps {
  params: { section: string };
}

/** 认证过滤：名称字段全空白的脏数据不渲染（与默认实现同口径） */
function filterCertifications(certs: any[]): any[] {
  if (!Array.isArray(certs)) return [];
  return certs.filter(
    (c: any) =>
      (c?.name || c?.nameEn || c?.nameJa || c?.nameKo || c?.nameFr || c?.nameAr) &&
      String(c.name || c.nameEn || "").trim() !== ""
  );
}

/** 内容块去重（历史数据里 zh/en 块可能重复写入后缀列，按 blockId 去重） */
function dedupeBlocks(blocks: any[]): any[] {
  const seen = new Set<string>();
  return blocks.filter((b: any) => {
    if (!b || typeof b !== "object") return false;
    const key = b.blockId || `${b.heading}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * KITZ SCT 日式工业风 · 关于我们分页（profile / culture / history / honors）
 *
 * 数据源：GET /api/public/about?slug=xxx（**单对象**，非 {success,data} 包装）。
 * 多语言：块级取词一律经 createLocalizedGetter（loc.get / loc.getArray），
 * 不做 `locale === "en" ? xEn : x` 这类硬编码分支。
 *
 * ⚠️ 与 UNILOK 对应件的**有意差异**：UNILOK 在接口失败时回退到 `lib/about.ts` 的
 *    硬编码板块数据 —— 那份数据是某一站点的历史文案（含该站行业与品牌表述），
 *    放进主题树会让别的部署渲染出别人的公司简介，违反 G2「站点差异不写死」。
 *    这里改为**只认接口**：失败给可重试的错误态，未命中给 404。
 */
export default function KitzAboutSectionPage({ params }: PageProps) {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [section, setSection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [siblings, setSiblings] = useState<{ slug: string; title: string; titleEn?: string }[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  // 当前板块
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetch(`/api/public/about?slug=${encodeURIComponent(params.section)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        // 契约：命中返回板块对象（带 slug），未命中返回错误对象 ⇒ 按字段判定
        return data && data.slug ? data : null;
      })
      .then((data) => {
        if (cancelled) return;
        setSection(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.section, reloadKey]);

  // 同级板块（用于底部子导航）：同一接口不带 slug 时返回**裸数组**
  // 为什么不 import lib/about 的 aboutSections：那是站点硬编码文案，见文件头说明
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/about", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setSiblings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <span className="text-sm text-dark-400">{t("loading")}</span>
      </div>
    );
  }

  // 错误态（可重试）
  if (failed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-6 text-sm text-dark-500">{t("kitzLoadFailed")}</p>
        <button
          type="button"
          onClick={retry}
          className="border border-dark px-6 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-dark hover:text-white"
        >
          {t("kitzRetry")}
        </button>
      </div>
    );
  }

  if (!section) notFound();

  const certifications = filterCertifications(section.certifications);
  const highlights: any[] = loc.getArray(section, "highlights");
  const timeline: any[] = loc.getArray(section, "timeline");

  // 内容块解析：为什么这么绕 —— 后台把 zh/en 块**合并**进 content 并打 lang 标记，
  // 其余语种存独立后缀列（contentJa/Ko/Fr/Ar），历史数据还可能没有 lang 字段。
  const renderBlocks = (blocks: any[]) =>
    blocks.map((block: any, i: number) => {
      const heading = loc.get(block, "heading");
      const paras: string[] = loc.getArray(block, "paragraphs");
      return (
        <div key={block.blockId || i}>
          {heading && (
            <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3">
              <span className="h-2 w-2 shrink-0 bg-primary" />
              <h2 className="text-lg font-bold tracking-tight text-dark">
                {heading}
              </h2>
            </div>
          )}
          <div className="space-y-4">
            {(paras || []).map((p: string, j: number) => (
              <p key={j} className="text-sm leading-relaxed text-dark-600">
                {p}
              </p>
            ))}
          </div>
        </div>
      );
    });

  const rawContent: any[] = Array.isArray(section.content) ? section.content : [];
  const hasLangField = rawContent.some((b: any) => b && b.lang);

  function renderContent() {
    if (hasLangField) {
      // 1) 基础数组里当前语种的块（lang 是数据字段，等于 locale 即命中，非硬编码分支）
      const currentLangBlocks = rawContent.filter(
        (b: any) => (b.lang || "zh") === locale
      );
      if (currentLangBlocks.length > 0) return renderBlocks(currentLangBlocks);
      // 2) 回退：后缀列（contentJa/Ko/Fr/Ar）——块内已是该语种译文
      const suffixBlocks = dedupeBlocks(loc.getArray(section, "content"));
      if (suffixBlocks.length > 0) return renderBlocks(suffixBlocks);
      // 3) 兜底：中文块
      return renderBlocks(rawContent.filter((b: any) => (b.lang || "zh") === "zh"));
    }
    // 旧数据：无 lang 字段 ⇒ 直接按后缀列取当前语种
    const langBlocks = loc.getArray(section, "content");
    if (langBlocks.length > 0) return renderBlocks(langBlocks);
    return renderBlocks(rawContent);
  }

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowAbout")}
        title={loc.get(section, "title")}
        subtitle={loc.get(section, "subtitle")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("about"), href: "/about" },
          { label: loc.get(section, "title") },
        ]}
      />

      {/* 正文块 */}
      {rawContent.length > 0 && (
        <section className="bg-white py-16 lg:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl space-y-12">{renderContent()}</div>

            {/* 数据要点（highlights） */}
            {highlights.length > 0 && (
              <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px border border-gray-200 bg-gray-200 sm:grid-cols-4">
                {highlights.map((h: any, i: number) => (
                  <div key={i} className="bg-white p-5 text-center">
                    <div className="mb-1 text-xl font-bold tabular-nums tracking-tight text-dark">
                      {loc.get(h, "value")}
                    </div>
                    <div className="text-xs tracking-wide text-dark-400">
                      {loc.get(h, "label")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 发展历程（若该板块带 timeline） */}
      {timeline.length > 0 && (
        <section className="border-y border-gray-200 bg-dark-50 py-16 lg:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 border-b border-dark pb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                  {t("ourHistory")}
                </h2>
              </div>
              <div className="relative">
                <div className="absolute start-[7px] top-2 bottom-2 w-px bg-gray-200" />
                <div className="space-y-10">
                  {timeline.map((item: any, i: number) => (
                    <div key={item.year || i} className="relative ps-10">
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
          </div>
        </section>
      )}

      {/* 资质与荣誉 */}
      {certifications.length > 0 && (
        <section className="bg-white py-16 lg:py-24">
          <div className="container">
            <div className="mb-10 border-b border-dark pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                {t("ourHonors")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert: any, i: number) => {
                const certName = loc.get(cert, "name");
                const certIssuer = loc.get(cert, "issuer");
                const certYear = cert?.year;
                return (
                  <div
                    key={i}
                    className="border border-gray-200 bg-white p-6 transition-colors hover:border-dark"
                  >
                    <div className="mb-5 flex h-10 w-10 items-center justify-center border border-gray-200">
                      <Award size={18} className="text-primary" />
                    </div>
                    {certName && (
                      <h3 className="mb-2 text-base font-bold tracking-tight text-dark">
                        {certName}
                      </h3>
                    )}
                    {certIssuer && (
                      <p className="mb-1 text-sm text-dark-500">{certIssuer}</p>
                    )}
                    {certYear && (
                      <p className="text-xs tabular-nums tracking-wide text-dark-400">
                        {certYear}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 同级板块子导航（来自接口列表，不写死站点板块） */}
      {siblings.length > 0 && (
        <section className="border-t border-gray-200 bg-white py-12">
          <div className="container">
            <div className="flex flex-wrap justify-center gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/about/${s.slug}`}
                  className={`border px-5 py-2.5 text-sm font-medium tracking-wide transition-colors ${
                    s.slug === section.slug
                      ? "border-dark bg-dark text-white"
                      : "border-gray-200 bg-white text-dark-600 hover:border-dark hover:text-dark"
                  }`}
                >
                  {loc.get(s, "title")}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          <div className="border border-gray-200 p-10 text-center lg:p-14">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
              {t("wantLearnMore")}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-dark-500">
              {t("contactAboutInfo")}
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
  );
}
