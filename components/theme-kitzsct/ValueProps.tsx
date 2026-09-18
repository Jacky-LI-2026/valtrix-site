"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

/**
 * KITZ SCT 日式工业风 — 「我们是谁」图文并排
 *
 * 左图右文（移动端上下堆叠）。图片与导语来自 `/api/public/about`
 * （与 UNILOK 的 WhoWeAre 同一接口），无数据时用 i18n 文案兜底；
 * 图片缺失时退化为**留白 + 细边框 + 竖排标签**的版式占位块，
 * 而不是拉一张别的产品的图来充数（避免误导）。
 */
export default function KitzValueProps() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);

  const [lead, setLead] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/about", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const first = data[0];
        // description 是标量字符串；content 是内容块对象数组，故用 get 而非 getText
        setLead(loc.get(first, "description") || "");
        setImage(typeof first?.image === "string" ? first.image : "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const points = [t("kitzValuePoint1"), t("kitzValuePoint2"), t("kitzValuePoint3"), t("kitzValuePoint4")];

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左：方形图片（KITZ 用直角图，不做大圆角） */}
          <div className="relative">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                loading="lazy"
                className="aspect-square w-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center border border-gray-200 bg-gray-50">
                <span className="px-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-dark-300">
                  {t("kitzValueImageAlt")}
                </span>
              </div>
            )}
            {/* 右下角细线角标 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 end-0 h-16 w-16 border-b border-e border-dark"
            />
          </div>

          {/* 右：文字 */}
          <div className="lg:pt-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzValueEyebrow")}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-dark md:text-4xl">
              {t("kitzValueTitle")}
            </h2>

            {/* 导语：about 数据优先，静态文案兜底 */}
            <p className="mt-6 leading-relaxed text-dark-500">
              {lead || t("kitzValueLead")}
            </p>

            <ul className="mt-10 divide-y divide-gray-100 border-y border-gray-100">
              {points.map((p, i) => (
                <li key={i} className="flex items-start gap-4 py-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-gray-300 text-dark">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm leading-relaxed text-dark-600">{p}</p>
                </li>
              ))}
            </ul>

            <Link
              href="/about"
              className="group mt-10 inline-flex items-center gap-2 border border-dark px-6 py-3 text-sm font-semibold uppercase tracking-wider text-dark transition-colors hover:bg-dark hover:text-white"
            >
              {t("kitzValueMore")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
