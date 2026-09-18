"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

interface NewsItem {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  publishedAt?: string;
}

/**
 * UNILOK 精密工业风 — 新闻动态（最新 4 条横向卡片）
 * 数据：/api/public/news?limit=4
 */
export default function NewsSection() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [news, setNews] = useState<NewsItem[]>([]);
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {t("unilokNewsEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              {t("unilokNewsTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("unilokNewsSubtitle")}</p>
          </div>
          <Link
            href="/news"
            className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:text-accent"
          >
            {t("unilokNewsMore")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200 p-6">
                <div className="h-3 w-24 bg-gray-100" />
                <div className="mt-4 h-5 w-3/4 bg-gray-100" />
                <div className="mt-3 h-3 w-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-dark-400">{t("noContent")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="group flex flex-col border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-accent hover:shadow-[0_12px_32px_rgba(15,52,96,0.08)]"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-dark-400">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  {formatDate(item.publishedAt)}
                </div>
                <h3 className="mt-3 text-lg font-bold leading-snug text-primary transition-colors group-hover:text-accent">
                  {loc.get(item, "title")}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dark-500">
                  {loc.getText(item, "summary")}
                </p>
                <span className="mt-auto pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:text-accent">
                    {t("viewDetails")}
                    <ArrowRight className="h-4 w-4 rtl-flip" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
