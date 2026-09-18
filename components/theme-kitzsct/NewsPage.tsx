"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import KitzPageHero from "./PageHero";

/**
 * 新闻条目（/api/public/news 的字段形状）。
 * 注意：category 的多语言是**扁平分列**（name / nameEn / …），
 * 故一律走 loc.get(category, "name")，不得直接读 name/nameEn 原始字段
 * （那样会绕开多语言，英文站显示中文分类名）。
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
}

const PAGE_SIZE = 6;

/** 日期格式化：非法/空值返回空串（调用处据此隐藏日期，而不是显示 Invalid Date） */
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * KITZ SCT 日式工业风 · 新闻列表页
 * PageHero + 分类 chip（全部/分类）+ 细线行式列表 + 加载更多
 */
export default function KitzNewsPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [activeCategory, setActiveCategory] = useState("");

  // 抽成回调：失败态需要「重试」，重试 = 重新跑同一次请求
  const loadNews = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch("/api/public/news?limit=50")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        // 无 category 参数时该接口返回**裸数组**；形状不符按失败处理，避免静默空列表
        if (Array.isArray(data)) setNews(data);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // 分类列表：按 slug 去重并保持接口返回的先后顺序（分类名走 loc.get 取当前语种）
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

  const chipBase =
    "border px-4 py-2 text-xs font-medium tracking-wide transition-colors";
  const chipOn = "border-dark bg-dark text-white";
  const chipOff =
    "border-gray-200 bg-white text-dark-500 hover:border-dark hover:text-dark";

  return (
    <>
      <KitzPageHero
        eyebrow={t("kitzEyebrowNews")}
        title={t("news")}
        subtitle={t("kitzNewsIntro")}
        breadcrumb={[{ label: t("home"), href: "/" }, { label: t("news") }]}
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="container">
          {loading ? (
            <div className="border-t border-gray-200 py-24 text-center text-sm text-dark-400">
              {t("loading")}
            </div>
          ) : failed ? (
            /* 错误态：明确告知失败并提供重试，不伪装成「暂无新闻」 */
            <div className="border border-gray-200 py-20 text-center">
              <p className="mb-6 text-sm text-dark-500">{t("kitzLoadFailed")}</p>
              <button
                type="button"
                onClick={loadNews}
                className="border border-dark px-6 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-dark hover:text-white"
              >
                {t("kitzRetry")}
              </button>
            </div>
          ) : (
            <>
              {/* 分类筛选：全部 + 各分类（分类名经 loc.get 多语言化） */}
              {categories.length > 1 && (
                <div className="mb-10 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("")}
                    className={`${chipBase} ${
                      activeCategory === "" ? chipOn : chipOff
                    }`}
                  >
                    {t("viewAll")}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() =>
                        setActiveCategory(
                          activeCategory === cat.slug ? "" : cat.slug
                        )
                      }
                      className={`${chipBase} ${
                        activeCategory === cat.slug ? chipOn : chipOff
                      }`}
                    >
                      {loc.get(cat, "name")}
                    </button>
                  ))}
                </div>
              )}

              {/* 行式列表：细分割线 + 左栏日期（KITZ 的报表式排版） */}
              {shown.length === 0 ? (
                <p className="border border-dashed border-gray-200 py-24 text-center text-sm text-dark-400">
                  {t("kitzNoNews")}
                </p>
              ) : (
                <div className="border-t border-gray-200">
                  {shown.map((item) => {
                    const dateStr = formatDate(item.publishedAt);
                    return (
                      <Link
                        key={item.id}
                        href={`/news/${item.slug}`}
                        className="group grid grid-cols-1 gap-4 border-b border-gray-200 py-8 transition-colors hover:bg-dark-50 sm:grid-cols-[140px_1fr] sm:gap-8"
                      >
                        {/* 左栏：日期 + 分类 */}
                        <div className="flex flex-col gap-2">
                          {dateStr && (
                            <span className="flex items-center gap-1.5 text-xs tabular-nums tracking-wide text-dark-400">
                              <Calendar size={12} />
                              {dateStr}
                            </span>
                          )}
                          {item.category && (
                            <span className="w-fit border border-gray-200 px-2 py-0.5 text-[11px] tracking-wide text-dark-500">
                              {loc.get(item.category, "name")}
                            </span>
                          )}
                        </div>

                        {/* 右栏：标题 + 摘要 + 阅读更多 */}
                        <div className="min-w-0">
                          <h3 className="mb-3 text-lg font-bold tracking-tight text-dark transition-colors group-hover:text-primary">
                            {loc.get(item, "title")}
                          </h3>
                          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-dark-500">
                            {loc.get(item, "summary")}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-primary transition-all group-hover:gap-2">
                            {t("readMore")}
                            <ArrowRight size={13} className="rtl-flip" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 加载更多（本地分页，不发新请求 —— 与 UNILOK 同口径） */}
              {visible < filtered.length && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="border border-dark px-8 py-3 text-sm font-medium text-dark transition-colors hover:bg-dark hover:text-white"
                  >
                    {t("kitzLoadMore")}
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
