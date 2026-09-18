"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { industries as defaultIndustries } from "@/lib/industries";

/**
 * KITZ SCT 日式工业风 — 应用领域
 *
 * 数据：`/api/public/industries`（与 UNILOK Industries 同一接口），
 * 无数据时回退 `lib/industries` 静态列表。
 *
 * 版式：方形图片 + 序号 + 名称 + 一句话，鼠标悬停整块转深底白字；
 * 图片缺失时退化为灰色占位块（不借用其它领域的图，避免误导）。
 */
export default function KitzIndustries() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/industries", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setList(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const source: any[] = list.length > 0 ? list : defaultIndustries;
  const shown = source.slice(0, 6);

  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzIndustriesEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-dark md:text-4xl">
              {t("kitzIndustriesTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("kitzIndustriesSubtitle")}</p>
          </div>
          <Link
            href="/industries"
            className="group inline-flex items-center gap-2 border border-dark px-6 py-3 text-sm font-semibold uppercase tracking-wider text-dark transition-colors hover:bg-dark hover:text-white"
          >
            {t("kitzIndustriesMore")}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl-flip" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((industry: any, index: number) => {
            const image = typeof industry?.image === "string" ? industry.image : "";
            const name = loc.get(industry, "name");
            return (
              <Link
                key={industry.slug || index}
                href={`/industries/${industry.slug}`}
                className="group relative block bg-white transition-colors duration-300 hover:bg-dark"
              >
                {/* 方形图区 */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-mono text-xs uppercase tracking-[0.3em] text-dark-300 transition-colors group-hover:text-white/50">
                        {t("kitzIndustriesImageAlt")}
                      </span>
                    </div>
                  )}
                  {/* 序号角标：白底细框，日式工业风的编号感 */}
                  <span className="absolute start-0 top-0 flex h-11 w-11 items-center justify-center border-b border-e border-gray-200 bg-white font-mono text-xs font-bold text-dark-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold tracking-tight text-dark transition-colors group-hover:text-white">
                    {name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-dark-500 transition-colors group-hover:text-white/70">
                    {loc.get(industry, "tagline") || loc.get(industry, "description")}
                  </p>
                  <div className="mt-5 h-px w-8 bg-dark transition-all duration-300 group-hover:w-16 group-hover:bg-white" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
