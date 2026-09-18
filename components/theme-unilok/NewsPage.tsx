"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
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
}

const PAGE_SIZE = 6;

/**
 * UNILOK 精密工业风 · 新闻列表页
 * PageHero + 分类筛选 + 大图卡片（日期+标题+摘要+阅读更多）+ 加载更多
 */
export default function UnilokNewsPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    fetch("/api/public/news?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNews(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 分类列表（去重，保持出现顺序）
  const categories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; nameEn: string }>();
    news.forEach((n) => {
      if (n.category?.slug) {
        map.set(n.category.slug, {
          slug: n.category.slug,
          name: n.category.name,
          nameEn: n.category.nameEn,
        });
      }
    });
    return Array.from(map.values());
  }, [news]);

  const filtered =
    activeCategory && activeCategory !== "all"
      ? news.filter((n) => n.category?.slug === activeCategory)
      : news;
  const shown = filtered.slice(0, visible);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  return (
    <>
      <UnilokPageHero
        eyebrow={t("unilokEyebrowNews")}
        title={t("news")}
        subtitle={t("unilokNewsIntro")}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("news") },
        ]}
      />

      <section className="bg-white py-14 lg:py-20">
        <div className="container">
          {loading ? (
            <div className="py-20 text-center text-dark-400">{t("loading")}</div>
          ) : (
            <>
              {/* 分类筛选 */}
              {categories.length > 1 && (
                <div className="mb-10 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("")}
                    className={`border px-4 py-2 text-sm font-medium transition-colors ${
                      activeCategory === ""
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-dark-500 hover:border-accent hover:text-accent"
                    }`}
                  >
                    {t("viewAll")}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() =>
                        setActiveCategory(activeCategory === cat.slug ? "" : cat.slug)
                      }
                      className={`border px-4 py-2 text-sm font-medium transition-colors ${
                        activeCategory === cat.slug
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 bg-white text-dark-500 hover:border-accent hover:text-accent"
                      }`}
                    >
                      {loc.get(cat, "name")}
                    </button>
                  ))}
                </div>
              )}

              {/* 新闻卡片（2 列网格） */}
              {shown.length === 0 ? (
                <p className="py-20 text-center text-dark-400">{t("unilokNoNews")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {shown.map((item) => {
                    const dateStr = formatDate(item.publishedAt);
                    return (
                      <Link
                        key={item.id}
                        href={`/news/${item.slug}`}
                        className="group flex flex-col overflow-hidden border border-gray-200 bg-white transition-colors hover:border-accent"
                      >
                        {/* 大图 */}
                        <div className="relative aspect-[16/9] overflow-hidden bg-dark-50">
                          {item.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.coverImage}
                              alt={loc.get(item, "title")}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src="/placeholders/generic-tech.webp"
                              alt={loc.get(item, "title")}
                              loading="lazy"
                              className="h-full w-full object-cover opacity-80"
                            />
                          )}
                          <span className="pointer-events-none absolute top-0 start-0 h-10 w-10 border-s-2 border-t-2 border-accent" />
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                          {/* 日期 + 分类 */}
                          <div className="mb-3 flex items-center gap-4">
                            {dateStr && (
                              <span className="flex items-center gap-1.5 text-xs text-dark-400">
                                <Calendar size={13} />
                                {dateStr}
                              </span>
                            )}
                            {item.category && (
                              <span className="bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent">
                                {loc.get(item.category, "name")}
                              </span>
                            )}
                          </div>
                          <h3 className="mb-3 line-clamp-2 text-lg font-bold text-dark transition-colors group-hover:text-primary">
                            {loc.get(item, "title")}
                          </h3>
                          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-dark-500">
                            {loc.get(item, "summary")}
                          </p>
                          <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all group-hover:gap-2">
                            {t("readMore")}
                            <ArrowRight size={14} className="rtl-flip" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 加载更多 */}
              {visible < filtered.length && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="border border-primary px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    {t("unilokLoadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
