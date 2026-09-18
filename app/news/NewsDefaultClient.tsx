"use client";

import { useState, useEffect, useMemo } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";

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

export default function NewsDefaultClient() {
  const { locale , t} = useI18n();
    const loc = createLocalizedGetter(locale);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const { pageConfig } = usePageConfig("news");

  useEffect(() => {
    fetch("/api/public/news?limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNews(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 分类列表（去重，保持出现顺序）
  const categories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; nameEn: string }>();
    news.forEach((n) => {
      if (n.category?.slug) {
        map.set(n.category.slug, { slug: n.category.slug, name: n.category.name, nameEn: n.category.nameEn });
      }
    });
    return Array.from(map.values());
  }, [news]);

  const filteredNews = activeCategory ? news.filter((n) => n.category?.slug === activeCategory) : news;
  const featured = filteredNews.find((n) => n.isFeatured);
  const regular = filteredNews.filter((n) => !n.isFeatured);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("news")}
        titleEn={pageConfig?.titleEn || "News"}
        subtitle={pageConfig?.subtitle || t("newsPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "Stay updated with VALTRIX's latest news, product launches and technical articles"}
        breadcrumb={pageConfig?.breadcrumb || t("news")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "News"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          {loading ? (
            <div className="text-center py-20 text-dark-400">{t("loading")}</div>
          ) : (
            <>
              {/* 分类筛选 */}
              {categories.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 mb-10">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === ""
                        ? "bg-primary text-white"
                        : "bg-dark-100 text-dark-500 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {t("viewAll") || "全部"}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setActiveCategory(activeCategory === cat.slug ? "" : cat.slug)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === cat.slug
                          ? "bg-primary text-white"
                          : "bg-dark-100 text-dark-500 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {loc.get(cat, "name")}
                    </button>
                  ))}
                </div>
              )}

              {featured && (
                <Link
                  href={`/news/${featured.slug}`}
                  className="block bg-dark-900 rounded-lg overflow-hidden mb-12 group"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="aspect-[16/10] lg:aspect-auto bg-gradient-to-br from-primary-900 to-dark-800 flex items-center justify-center overflow-hidden">
                      {featured.coverImage ? (
                        <img src={featured.coverImage} alt={loc.get(featured, "title")} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/placeholders/generic-tech.webp" alt={loc.get(featured, "title")} className="w-full h-full object-cover opacity-80" />
                      )}
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs bg-primary text-white px-3 py-1 rounded">
                          {loc.get(featured.category, "name")}
                        </span>
                        <span className="text-dark-400 text-sm flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(featured.publishedAt)}
                        </span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 group-hover:text-primary transition-colors">
                        {loc.get(featured, "title")}
                      </h2>
                      <p className="text-dark-300 leading-relaxed mb-6">{loc.get(featured, "summary")}</p>
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all w-fit">
                        {t("readFullArticle")}
                        <ArrowRight size={14} className="rtl-flip" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regular.map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center overflow-hidden">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={loc.get(item, "title")} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/placeholders/generic-tech.webp" alt={loc.get(item, "title")} className="w-full h-full object-cover opacity-80" />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded flex items-center gap-1">
                          <Tag size={12} />
                          {loc.get(item.category, "name")}
                        </span>
                        <span className="text-dark-400 text-xs flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(item.publishedAt)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {loc.get(item, "title")}
                      </h3>
                      <p className="text-dark-500 text-sm leading-relaxed line-clamp-3 mb-4">{loc.get(item, "summary")}</p>
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                        {t("readMore")}
                        <ArrowRight size={14} className="rtl-flip" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {regular.length === 0 && !featured && (
                <div className="text-center py-20 text-dark-400">暂无新闻</div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
