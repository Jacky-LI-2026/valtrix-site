"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronLeft, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { getBrandNameEn } from "@/lib/brand";
import KitzPageHero from "./PageHero";
import KitzCornerAccent from "./CornerAccent";

/**
 * 新闻条目（/api/public/news 的字段形状；category 为**扁平分列**多语言，
 * 故取分类名一律走 loc.get(category, "name")）。
 */
interface NewsItem {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  summary: string;
  content: string;
  category: { id: string; name: string; nameEn: string; slug: string } | null;
  isFeatured: boolean;
  isTop: boolean;
  publishedAt: string;
  coverImage: string;
  video?: string;
}

interface NewsCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
}

/**
 * 派发页逐个透传 props.params，故形状必须与派发页完全一致 —— 不得改成 props.slug。
 */
interface PageProps {
  params: { slug: string };
}

/** 日期格式化：空/非法返回空串（调用处据此隐藏，而不是渲染 Invalid Date） */
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** 相关新闻/分类列表共用的小卡（方形图 + 细线边框，KITZ 风） */
function KitzNewsThumb({
  href,
  coverImage,
  alt,
  title,
  summary,
  categoryName,
  date,
  readMoreLabel,
}: {
  href: string;
  coverImage: string;
  alt: string;
  title: string;
  summary: string;
  categoryName?: string | null;
  date?: string;
  readMoreLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-gray-200 bg-white transition-colors hover:border-dark"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage || "/placeholders/generic-tech.webp"}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <KitzCornerAccent />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {date && (
            <span className="flex items-center gap-1.5 text-xs tabular-nums text-dark-400">
              <Calendar size={12} />
              {date}
            </span>
          )}
          {categoryName && (
            <span className="border border-gray-200 px-2 py-0.5 text-[11px] text-dark-500">
              {categoryName}
            </span>
          )}
        </div>
        <h3 className="mb-3 line-clamp-2 text-base font-bold tracking-tight text-dark transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-dark-500">
          {summary}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-primary transition-all group-hover:gap-2">
          {readMoreLabel}
          <ArrowRight size={13} className="rtl-flip" />
        </span>
      </div>
    </Link>
  );
}

/**
 * KITZ SCT 日式工业风 · 新闻详情页 / 新闻分类列表页
 *
 * 数据获取逻辑与 UNILOK 对应件一致：
 *   1) 先按 slug 查新闻 → 命中显示详情
 *   2) 未命中改按 category 查 → 显示该分类列表（支持 /news/公司新闻 这类路径）
 *   3) 都不命中 → 404
 * 差别：网络异常不再伪装成 404，而是给出可重试的错误态。
 */
export default function KitzNewsDetailPage({ params }: PageProps) {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const slug =
    typeof params?.slug === "string" ? decodeURIComponent(params.slug) : "";

  const [mode, setMode] = useState<
    "detail" | "category" | "notfound" | "error" | null
  >(null);
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [categoryData, setCategoryData] = useState<{
    category: NewsCategory;
    items: NewsItem[];
  } | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 失败重试：递增即重跑加载 effect（比整页刷新轻，且不丢 SPA 状态）
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadData() {
      try {
        // preview=1 供后台预览未发布稿件（与默认实现一致）
        const preview =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("preview") === "1";
        const slugRes = await fetch(
          `/api/public/news?slug=${encodeURIComponent(slug)}${preview ? "&preview=1" : ""}`
        );
        if (slugRes.ok) {
          const data = await slugRes.json();
          if (!cancelled) {
            setArticle(data);
            setMode("detail");
          }
          return;
        }

        // 未命中新闻，退一步按分类查（该分支返回 { category, items }，不是裸数组）
        const catRes = await fetch(
          `/api/public/news?category=${encodeURIComponent(slug)}`
        );
        if (catRes.ok) {
          const data = await catRes.json();
          if (!cancelled) {
            setCategoryData(data);
            setMode("category");
          }
          return;
        }

        // 两个分支都不命中 ⇒ 真正的 404
        if (!cancelled) setMode("notfound");
      } catch (err) {
        console.error("加载新闻失败:", err);
        // 网络/解析异常与「不存在」是两回事，分别给出可重试的错误态
        if (!cancelled) setMode("error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  // 命中详情后加载相关新闻（接口返回裸数组，剔除自身后取 3 条）
  useEffect(() => {
    if (mode !== "detail" || !article) return;
    fetch("/api/public/news?limit=4")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRelatedNews(
            data.filter((n: NewsItem) => n.slug !== article.slug).slice(0, 3)
          );
        }
      })
      .catch(() => {});
  }, [mode, article]);

  // 同步浏览器标签页标题（声明在所有提前 return 之前，保证 Hooks 顺序稳定）
  useEffect(() => {
    if (mode === "detail" && article) {
      document.title = `${loc.get(article, "title")} - ${getBrandNameEn()}`;
    } else if (mode === "category" && categoryData) {
      const n = loc.get(categoryData.category, "name");
      document.title = `${n} - ${getBrandNameEn()}`;
    }
  }, [mode, article, categoryData, loc]);

  if (loading || !mode) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <span className="text-sm text-dark-400">{t("loading")}</span>
      </div>
    );
  }

  // 错误态（可重试）
  if (mode === "error") {
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

  // 404
  if (mode === "notfound") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.3em] text-dark-300">
          404
        </p>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-dark">
          {t("kitzNewsNotFound")}
        </h1>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 border border-gray-200 px-6 py-3 text-sm font-medium text-dark-600 transition-colors hover:border-dark hover:text-dark"
        >
          <ChevronLeft size={16} className="rtl-flip" />
          {t("kitzBackToNews")}
        </Link>
      </div>
    );
  }

  // 详情模式兜底（理论不可达，防御性返回）
  if (mode === "detail" && !article) return null;

  // ==================== 分类列表模式 ====================
  if (mode === "category" && categoryData) {
    const catName = loc.get(categoryData.category, "name");
    const items = categoryData.items || [];
    return (
      <>
        <KitzPageHero
          eyebrow={t("kitzEyebrowNews")}
          title={catName}
          subtitle={`${items.length} ${t("kitzArticleCount")}`}
          breadcrumb={[
            { label: t("home"), href: "/" },
            { label: t("news"), href: "/news" },
            { label: catName },
          ]}
        />

        <section className="bg-white py-16 lg:py-24">
          <div className="container">
            {items.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <KitzNewsThumb
                    key={item.id}
                    href={`/news/${item.slug}`}
                    coverImage={item.coverImage}
                    alt={loc.get(item, "title")}
                    title={loc.get(item, "title")}
                    summary={loc.get(item, "summary")}
                    categoryName={loc.get(item.category, "name")}
                    date={formatDate(item.publishedAt)}
                    readMoreLabel={t("readMore")}
                  />
                ))}
              </div>
            ) : (
              <p className="border border-dashed border-gray-200 py-24 text-center text-sm text-dark-400">
                {t("kitzNoNews")}
              </p>
            )}
          </div>
        </section>
      </>
    );
  }

  // ==================== 详情模式 ====================
  const dateStr = formatDate(article!.publishedAt);
  const articleTitle = loc.get(article, "title");

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowNews")}
        title={articleTitle}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("news"), href: "/news" },
          { label: articleTitle },
        ]}
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* 元信息：日期 + 分类（细线分隔，KITZ 不用色块） */}
            <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-gray-200 pb-6">
              {dateStr && (
                <span className="flex items-center gap-1.5 text-xs tabular-nums tracking-wide text-dark-400">
                  <Calendar size={13} />
                  {dateStr}
                </span>
              )}
              {article!.category && (
                <span className="border border-gray-200 px-2.5 py-1 text-[11px] font-medium tracking-wide text-dark-600">
                  {loc.get(article!.category, "name")}
                </span>
              )}
            </div>

            {/* 封面（16:9 方形直角 + L 形角标） */}
            {article!.coverImage && (
              <div className="relative mb-10 aspect-[16/9] overflow-hidden border border-gray-200 bg-dark-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article!.coverImage}
                  alt={articleTitle}
                  className="h-full w-full object-cover"
                />
                <KitzCornerAccent />
              </div>
            )}

            {/* 视频（如有） */}
            {article!.video && (
              <div className="mb-10 border border-gray-200 bg-black">
                <video
                  controls
                  className="max-h-96 w-full"
                  preload="metadata"
                  poster={article!.coverImage || undefined}
                >
                  <source src={article!.video} />
                  {/* 不用通用键 browserVideoNotSupported：该键在 zh 词表里是「对象型」值，
                      t() 只认字符串 ⇒ 中文站会直接渲染出键名本身。此处用本主题的字符串键。 */}
                  {t("kitzVideoNotSupported")}
                </video>
              </div>
            )}

            {/* 正文：content 为空时回落到 summary，避免空白页 */}
            <article
              className="prose max-w-none leading-relaxed text-dark-600"
              dangerouslySetInnerHTML={{
                __html: loc.get(article, "content") || loc.get(article, "summary"),
              }}
            />

            {/* 底部分类标签 */}
            {article!.category && (
              <div className="mt-12 flex items-center gap-3 border-t border-gray-200 pt-8">
                <Tag size={14} className="text-dark-300" />
                <span className="text-xs font-medium tracking-wide text-dark-500">
                  {loc.get(article!.category, "name")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 相关新闻 */}
      {relatedNews.length > 0 && (
        <section className="border-t border-gray-200 bg-dark-50 py-16 lg:py-24">
          <div className="container">
            <div className="mb-10 flex items-center justify-between border-b border-dark pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                {t("kitzRelatedNews")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedNews.map((item) => (
                <KitzNewsThumb
                  key={item.id}
                  href={`/news/${item.slug}`}
                  coverImage={item.coverImage}
                  alt={loc.get(item, "title")}
                  title={loc.get(item, "title")}
                  summary={loc.get(item, "summary")}
                  categoryName={loc.get(item.category, "name")}
                  date={formatDate(item.publishedAt)}
                  readMoreLabel={t("readMore")}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA（细线框，KITZ 不用整块色底） */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          <div className="border border-gray-200 p-10 text-center lg:p-14">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
              {t("wantLearnMore")}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-dark-500">
              {t("contactProductSupport")}
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
