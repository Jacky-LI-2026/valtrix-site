"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * KITZ SCT 日式工业风 — 底部 CTA
 *
 * 左：标题 + 描述；右：主按钮（/contact）+ 电话（有配置才渲染）。
 *
 * 电话来源：`/api/public/site-config?key=contact_info`（与 UNILOK CTASection 同一接口）。
 * ⚠️ G2：**绝不硬编码电话/邮箱** —— 未配置时整条电话按钮不渲染，
 * 也不生成退化的 `href="tel:"`（`lib/brand.ts` 对兜底值的契约要求）。
 *
 * 版式：深色底 + 细分隔线网格；不用圆角、不用大阴影。
 */
export default function KitzCTASection() {
  const { t } = useI18n();
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && data.data) setContact(data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const phone = typeof contact?.phone === "string" ? contact.phone.trim() : "";

  return (
    <section className="relative overflow-hidden bg-dark py-20 text-white lg:py-24">
      {/* 细分隔线网格（工业图纸感） */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-white/60" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                {t("kitzCtaEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-5xl">
              {t("kitzCtaTitle")}
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/70">{t("kitzCtaDesc")}</p>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row lg:justify-end">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-dark transition-colors hover:bg-gray-200"
            >
              {t("kitzCtaButton")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
            </Link>

            {phone && (
              <a
                href={`tel:${phone.replace(/[\s-]/g, "")}`}
                className="inline-flex items-center gap-2 border border-white/40 px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-white/10"
              >
                <Phone className="h-4 w-4 rtl-flip" />
                {/* 号码用 bdi + ltr 隔离，避免阿拉伯语环境下数字顺序被 bidi 重排 */}
                <bdi dir="ltr">{phone}</bdi>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
