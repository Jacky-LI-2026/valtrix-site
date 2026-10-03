"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { getBrandNameEn } from "@/lib/brand";
import CornerAccent from "./CornerAccent";

/**
 * UNILOK 精密工业风 — Who We Are 品牌故事
 * 左：大标题（带换行）+ 品牌导语（about 数据优先，静态文案兜底）
 * 右：要点列表
 */
export default function WhoWeAre() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [aboutLead, setAboutLead] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/about", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          const first = data[0];
          // description 是标量字符串字段；content 为内容块对象数组，getText 对其 String() 会产生 [object Object]
          const text = loc.get(first, "description") || "";
          if (text) setAboutLead(text);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const points = [t("unilokWhoP1"), t("unilokWhoP2"), t("unilokWhoP3"), t("unilokWhoP4")];

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* 左侧：大标题 */}
          <div className="relative">
            <CornerAccent className="hidden lg:block" />
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {t("about")}
              </span>
            </div>
            <h2 className="mt-6 text-3xl font-bold leading-[1.15] tracking-tight text-primary md:text-4xl lg:text-5xl">
              {t("unilokWhoTitle1") || getBrandNameEn()}
              <br />
              {t("unilokWhoTitle2")}
              <br />
              <span className="text-accent">{t("unilokWhoTitle3")}</span>
            </h2>

            {(aboutLead || t("unilokWhoLead")) && (
              <p className="mt-8 max-w-xl leading-relaxed text-dark-500">
                {aboutLead || t("unilokWhoLead")}
              </p>
            )}

            <div className="mt-10 hidden h-px w-24 bg-gray-200 lg:block" />
          </div>

          {/* 右侧：要点列表 */}
          <div className="lg:pt-14">
            <ul className="divide-y divide-gray-100">
              {points.map((p, i) => (
                <li key={i} className="flex items-start gap-4 py-5 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-accent text-accent">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <p className="leading-relaxed text-dark-700">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
