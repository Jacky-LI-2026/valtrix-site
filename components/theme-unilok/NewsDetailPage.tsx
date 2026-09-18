"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronLeft, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import UnilokPageHero from "./PageHero";

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

interface PageProps {
  params: { slug: string };
}

/** 新闻卡片（UNILOK 风：sharp 无圆角、hover 变 accent 边框、左上 L 形角标） */
function NewsCard({
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
      className="group flex flex-col overflow-hidden border border-gray-200 bg-white transition-colors hover:border-accent"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-dark-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage || "/placeholders/generic-tech.webp"}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute top-0 start-0 h-10 w-10 border-s-2 border-t-2 border-accent" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {date && (
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <Calendar size={13} />
              {date}
            </span>
          )}
          {categoryName && (
            <span className="bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent">
              {categoryName}
            </span>
          )}
        </div>
        <h3 className="mb-3 line-clamp-2 text-lg font-bold text-dark transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-dark-500">
          {summary}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all group-hover:gap-2">
          {readMoreLabel}
          <ArrowRight size={14} className="rtl-flip" />
        </span>
      </div>
    </Link>
  );
}

/**
 * UNILOK 精密工业风 · 新闻详情页 / 分类列表页
 * 数据获取逻辑与默认 NewsDetailClient 完全一致（slug → category → 404，相关新闻 limit=4）
 */
export default function UnilokNewsDetailPage({ params }: PageProps) {
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const slug = typeof params?.slug === "string" ? decodeURIComponent(params.slug) : "";
  const [mode, setMode] = useState<"detail" | "category" | "notfound" | null>(null);
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [categoryData, setCategoryData] = useState<{
    category: NewsCategory;
    items: NewsItem[];
  } | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) 先按新闻 slug 查询 → 命中则显示新闻详情
    // 2) 未命中则按分类查询（支持 /news/公司新闻、/news/Company News 等路径）→ 显示分类列表页
    // 3) 都不命中 → 404
    let cancelled = false;
    // slug 已在组件顶部 decodeURIComponent 一次，此处直接复用，避免二次解码

    async function loadData() {
      try {
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

        // 未命中则按分类查询
        const catRes = await fetch(`/api/public/news?category=${encodeURIComponent(slug)}`);
        if (catRes.ok) {
          const data = await catRes.json();
          if (!cancelled) {
            setCategoryData(data);
            setMode("category");
          }
          return;
        }

        // 都不命中
        if (!cancelled) {
          setMode("notfound");
        }
      } catch (err) {
        console.error("加载新闻失败:", err);
        if (!cancelled) {
          setMode("notfound");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  // 命中详情后加载相关新闻
  useEffect(() => {
    if (mode !== "detail" || !article) return;
    fetch("/api/public/news?limit=4")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRelatedNews(data.filter((n: NewsItem) => n.slug !== article.slug).slice(0, 3));
        }
      })
      .catch(() => {});
  }, [mode, article]);

  // 动态设置浏览器标题（必须在条件 return 之前声明，保证 hooks 顺序一致）
  useEffect(() => {
    if (mode === "detail" && article) {
      document.title = `${loc.get(article, "title")} - VALTRIX`;
    } else if (mode === "category" && categoryData) {
      const n = loc.get(categoryData.category, "name");
      document.title = `${n} - VALTRIX`;
    }
  }, [mode, article, categoryData]);

  if (loading || !mode) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <span className="text-dark-400">{t("loading")}</span>
      </div>
    );
  }

  // 404 页面
  if (mode === "notfound") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white">
        <h1 className="mb-4 text-5xl font-bold text-dark">404</h1>
        <p className="mb-8 text-dark-500">{t("unilokNewsNotFound")}</p>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          <ChevronLeft size={16} className="rtl-flip" />
          {t("unilokBackToNews")}
        </Link>
      </div>
    );
  }

  // 404 兜底
  if (mode === "detail" && !article) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  // ==================== 分类列表页模式 ====================
  if (mode === "category" && categoryData) {
    const catName = loc.get(categoryData.category, "name");
    const items = categoryData.items || [];
    return (
      <>
        <UnilokPageHero
          eyebrow={t("unilokEyebrowNews")}
          title={catName}
          subtitle={`${items.length} ${t("unilokArticleCount")}`}
          breadcrumb={[
            { label: t("home"), href: "/" },
            { label: t("news"), href: "/news" },
            { label: catName },
          ]}
        />

        <section className="bg-white py-14 lg:py-20">
          <div className="container">
            {items.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {items.map((item) => (
                  <NewsCard
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
              <p className="py-20 text-center text-dark-400">{t("unilokNoNews")}</p>
            )}
          </div>
        </section>
      </>
    );
  }

  // ==================== 新闻详情模式 ====================
  const dateStr = formatDate(article!.publishedAt);
  const articleTitle = loc.get(article, "title");

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowNews")}
        title={articleTitle}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("news"), href: "/news" },
          { label: articleTitle },
        ]}
      />

      {/* 文章主体 */}
      <section className="bg-white py-14 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {/* 元信息行：日期 + 分类 */}
            <div className="mb-8 flex flex-wrap items-center gap-4">
              {dateStr && (
                <span className="flex items-center gap-1.5 text-sm text-dark-500">
                  <Calendar size={15} />
                  {dateStr}
                </span>
              )}
              {article!.category && (
                <span className="bg-accent px-2.5 py-1 text-xs font-semibold text-white">
                  {loc.get(article!.category, "name")}
                </span>
              )}
            </div>

            {/* 封面图（16:9，L 形角标） */}
            <div className="relative mb-10 aspect-[16/9] overflow-hidden border border-gray-200 bg-dark-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article!.coverImage || "/placeholders/generic-tech.webp"}
                alt={articleTitle}
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute top-0 start-0 h-12 w-12 border-s-2 border-t-2 border-accent" />
              <span className="pointer-events-none absolute bottom-0 end-0 h-12 w-12 border-b-2 border-e-2 border-accent/50" />
            </div>

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
                  {t("browserVideoNotSupported")}
                </video>
              </div>
            )}

            {/* 正文 */}
            <article
              className="prose max-w-none leading-relaxed text-dark-600"
              dangerouslySetInnerHTML={{
                __html: loc.get(article, "content") || loc.get(article, "summary"),
              }}
            />

            {/* 底部分割线 + 分类标签 */}
            <div className="mt-12 flex items-center gap-3 border-t border-gray-200 pt-8">
              <Tag size={15} className="text-accent" />
              <span className="text-sm font-medium text-dark-600">
                {loc.get(article!.category, "name")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 相关新闻 */}
      {relatedNews.length > 0 && (
        <section className="border-y border-gray-200 bg-dark-50 py-14 lg:py-20">
          <div className="container">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-0.5 w-8 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {t("unilokEyebrowNews")}
              </span>
            </div>
            <h2 className="mb-10 text-2xl font-bold text-dark lg:text-3xl">
              {t("unilokRelatedNews")}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedNews.map((item) => (
                <NewsCard
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

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white lg:text-3xl">
            {t("wantLearnMore")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-white/80">
            {t("contactProductSupport")}
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
  );
}
