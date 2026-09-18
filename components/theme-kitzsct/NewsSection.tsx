"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

interface KitzNewsItem {
  id: string | number;
  slug: string;
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  publishedAt?: string;
  category?: { name?: string; nameEn?: string } | null;
}

/**
 * KITZ SCT 日式工业风 — 首页新闻列表
 *
 * 数据：`/api/public/news?limit=4`（与 UNILOK NewsSection 同一接口；
 * 该接口 `include: { category: true }`，故列表项带分类对象）。
 *
 * 版式：**一行一条**的横向列表 —— 日期 + 分类标签 + 标题 + 右侧 Read more，
 * 行间用细分隔线。与 UNILOK 的卡片网格不同，这是本主题的差异化版式。
 */
export default function KitzNewsSection() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [news, setNews] = useState<KitzNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/news?limit=4", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setNews(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzNewsEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-dark md:text-4xl">
              {t("kitzNewsTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("kitzNewsSubtitle")}</p>
          </div>
          <Link
            href="/news"
            className="group inline-flex items-center gap-2 border border-dark px-6 py-3 text-sm font-semibold uppercase tracking-wider text-dark transition-colors hover:bg-dark hover:text-white"
          >
            {t("kitzNewsMore")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse py-6">
                <div className="h-3 w-28 bg-gray-100" />
                <div className="mt-4 h-5 w-2/3 bg-gray-100" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="border-y border-gray-100 py-10 text-dark-400">{t("noContent")}</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {news.map((item) => {
              const categoryName = item.category
                ? loc.get(item.category, "name")
                : "";
              return (
                <li key={String(item.id)}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="group flex flex-col gap-3 py-6 transition-colors md:flex-row md:items-center md:gap-8"
                  >
                    {/* 日期 */}
                    <time
                      dateTime={item.publishedAt || undefined}
                      className="shrink-0 font-mono text-xs tracking-widest text-dark-400 md:w-28"
                    >
                      {formatDate(item.publishedAt)}
                    </time>

                    {/* 分类标签 */}
                    <span className="shrink-0">
                      {categoryName ? (
                        <span className="inline-block border border-gray-300 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-dark-500 transition-colors group-hover:border-dark group-hover:text-dark">
                          {categoryName}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-[11px] text-dark-300">—</span>
                      )}
                    </span>

                    {/* 标题（+ 摘要，桌面端单行省略） */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold leading-snug text-dark transition-colors group-hover:text-dark-600 md:text-lg">
                        {loc.get(item, "title")}
                      </span>
                      {loc.getText(item, "summary") && (
                        <span className="mt-1 line-clamp-1 block text-sm text-dark-400">
                          {loc.getText(item, "summary")}
                        </span>
                      )}
                    </span>

                    {/* 右下角 Read more */}
                    <span className="shrink-0 self-end md:self-auto">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-dark-500 transition-colors group-hover:text-dark">
                        {t("kitzNewsReadMore")}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl-flip" />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
