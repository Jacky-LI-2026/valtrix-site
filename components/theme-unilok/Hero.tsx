"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";

interface HeroSlide {
  image: string;
  eyebrow: string;
  title1: string;
  title2: string;
  desc: string;
  ctaText: string;
  ctaLink: string;
}

/**
 * UNILOK 精密工业风 — Hero 全宽轮播
 * 数据源：/api/public/home-config 的 banners（多语言对象字段），无 banners 时用产品 Tab 兜底
 * 兜底背景：深蓝渐变 + 技术图纸网格叠加
 */
export default function Hero() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs } = useProductTabs();

  const [banners, setBanners] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // 获取首页配置（banners）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/home-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.data?.banners) && data.data.banners.length > 0) {
          setBanners(data.data.banners);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 多语言对象取值（{zh,en,ja,ko,fr,ar}）或字符串
  const pickLang = (v: any, fallback = "") =>
    v && typeof v === "object" ? v[locale] || v.zh || fallback : v || fallback;

  // 构建轮播帧：优先后台 banners；否则用产品 Tab 前 4 个作为帧
  const slides: HeroSlide[] = (() => {
    if (banners.length > 0) {
      return banners.slice(0, 4).map((b: any) => ({
        image: b.image || "",
        eyebrow: t("unilokHeroEyebrow"),
        title1: pickLang(b.title) || t("unilokHeroTitle1"),
        title2: pickLang(b.subtitle) || t("unilokHeroTitle2"),
        desc: pickLang(b.description) || t("unilokHeroDesc"),
        ctaText: pickLang(b.ctaText) || t("unilokHeroCta"),
        ctaLink: b.ctaLink || "/products",
      }));
    }
    return productTabs.slice(0, 4).map((tab: any) => {
      const firstModel = tab.categories?.[0]?.models?.[0];
      const catDesc = tab.categories?.[0] ? loc.get(tab.categories[0], "description") : "";
      return {
        image: firstModel?.image || "",
        eyebrow: t("unilokHeroEyebrow"),
        title1: loc.get(tab, "name"),
        title2: t("unilokHeroTitle2"),
        desc: catDesc || t("unilokHeroDesc"),
        ctaText: t("unilokHeroCta"),
        ctaLink: `/products?tab=${tab.id}`,
      };
    });
  })();

  const next = useCallback(() => {
    if (slides.length > 0) setCurrent((p) => (p + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, paused, slides.length]);

  // 语种切换重置
  useEffect(() => {
    setCurrent(0);
  }, [locale]);

  if (slides.length === 0) {
    return (
      <section className="flex min-h-[520px] items-center bg-gradient-to-br from-[#0F3460] via-[#1A4B8C] to-[#0A2540]" />
    );
  }

  const slide = slides[current];
  const isRtl = locale === "ar";

  return (
    <section
      className="relative overflow-hidden bg-[#0A2540] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 背景层：当前帧图片 + 遮罩 */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {s.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A2540]/95 via-[#0A2540]/70 to-[#0A2540]/30" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F3460] via-[#1A4B8C] to-[#0A2540]" />
          )}
          {/* 技术图纸网格叠加 */}
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>
      ))}

      {/* 左侧叠加文字 */}
      <div className="container relative flex min-h-[520px] items-center py-24 lg:min-h-[600px]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              {slide.eyebrow}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
            {slide.title1}
            {slide.title2 && (
              <>
                <br />
                <span className="text-accent">{slide.title2}</span>
              </>
            )}
          </h1>

          {slide.desc && <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{slide.desc}</p>}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={slide.ctaLink}
              className="inline-flex items-center gap-2 bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#c93b14]"
            >
              {slide.ctaText}
              <ArrowRight className={`h-4 w-4 ${isRtl ? "rtl-flip" : ""}`} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-white/40 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
            >
              {t("unilokHeroCta2")}
            </Link>
          </div>
        </div>
      </div>

      {/* 底部圆点指示器 */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${t("unilokSlide")} ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i === current ? "w-10 bg-accent" : "w-5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
