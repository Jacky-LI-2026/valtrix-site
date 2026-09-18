"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Hero() {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [homeConfig, setHomeConfig] = useState<any>(null);

  // 从API获取首页配置（轮播图、统计数据等）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/home-config", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setHomeConfig(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取首页配置失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  const defaultSlides = [
    {
      title: t("heroTitle1"),
      subtitle: t("heroTitle2"),
      description: t("heroDesc"),
      ctaText: t("browseProducts"),
      ctaLink: "/products",
      bgGradient: "from-[#800000] via-[#CC0000] to-[#990000]",
      image: "",
    },
    {
      title: t("heroTitle2_2"),
      subtitle: t("heroSubtitle2_2"),
      description: t("heroDesc2"),
      ctaText: t("heroCta2"),
      ctaLink: "/about",
      bgGradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
      image: "",
    },
    {
      title: t("heroTitle3_3"),
      subtitle: t("heroSubtitle3_3"),
      description: t("heroDesc3"),
      ctaText: t("heroCta3"),
      ctaLink: "/contact",
      bgGradient: "from-[#2d3436] via-[#636e72] to-[#2d3436]",
      image: "",
    },
  ];

  // 从API数据构建轮播图，优先使用API数据
  // 多语言取值：对象（{zh,en,ja,...}）按当前 locale；字符串/老数据原样返回
  const pickLang = (v: any, fallback = "") =>
    v && typeof v === "object" ? (v[locale] || v.zh || fallback) : (v || fallback);

  const slides: { title: string; subtitle: string; description: string; ctaText: string; ctaLink: string; bgGradient: string; image: string; badge?: string; secondaryCtaText?: string; bgColor?: string; bgOpacity?: number; gradientEnabled?: boolean; gradientDirection?: string; gradientColor2?: string }[] = homeConfig?.banners && homeConfig.banners.length > 0
    ? homeConfig.banners.map((banner: any) => ({
        title: pickLang(banner.title),
        subtitle: pickLang(banner.subtitle),
        description: pickLang(banner.description),
        ctaText: pickLang(banner.ctaText),
        ctaLink: banner.ctaLink || "/products",
        bgGradient: banner.bgGradient || "from-[#800000] via-[#CC0000] to-[#990000]",
        image: banner.image || "",
        badge: pickLang(banner.badge),
        secondaryCtaText: pickLang(banner.secondaryCtaText),
        bgColor: banner.bgColor,
        bgOpacity: banner.bgOpacity,
        gradientEnabled: banner.gradientEnabled,
        gradientDirection: banner.gradientDirection,
        gradientColor2: banner.gradientColor2,
      }))
    : defaultSlides;

  // 背景配置（与页面头部配置 page-hero 同套能力：颜色/透明度/渐变/方向/第二色）
  // 旧数据（无 bgColor/gradientEnabled）走 bgGradient 渐变保持原样；新配置走计算样式
  const GRADIENT_DIR_MAP: Record<string, string> = {
    "to-bottom": "to bottom",
    "to-top": "to top",
    "to-left": "to left",
    "to-right": "to right",
    "to-bottom-right": "to bottom right",
    "to-bottom-left": "to bottom left",
  };
  const hexToRgba = (hex: string, alpha: number): string => {
    const h = (hex || "#0a0a0a").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const isLegacyBg = (slide: any): boolean => !slide.bgColor && !slide.gradientEnabled;
  // 有图时：作为遮罩层叠加在图片上（带透明度）
  const overlayStyle = (slide: any): React.CSSProperties => {
    const c = slide.bgColor || "#0a0a0a";
    const a = typeof slide.bgOpacity === "number" ? slide.bgOpacity : 0.35;
    if (slide.gradientEnabled) {
      const dir = GRADIENT_DIR_MAP[slide.gradientDirection] || "to bottom";
      return { background: `linear-gradient(${dir}, ${hexToRgba(c, a)}, ${hexToRgba(slide.gradientColor2 || "#1a1a2e", a)})` };
    }
    return { backgroundColor: hexToRgba(c, a) };
  };
  // 无图时：作为幻灯片背景（不透明）
  const bgStyle = (slide: any): React.CSSProperties => {
    const c = slide.bgColor || "#0a0a0a";
    if (slide.gradientEnabled) {
      const dir = GRADIENT_DIR_MAP[slide.gradientDirection] || "to bottom";
      return { background: `linear-gradient(${dir}, ${c}, ${slide.gradientColor2 || "#1a1a2e"})` };
    }
    return { backgroundColor: c };
  };

  const defaultStats = [
    { value: "6", label: t("statsProductSeries") },
    { value: "20+", label: t("statsIndustriesServed") },
    { value: "50000", label: t("statsAnnualOutput") },
    { value: "3000+", label: t("statsGlobalClients") },
  ];

  // 从API数据构建统计数据，优先使用API数据
  const stats: { value: string; label: string }[] = homeConfig?.stats && homeConfig.stats.length > 0
    ? homeConfig.stats.map((stat: any) => ({
        value: stat.number || stat.value || "",
        label: pickLang(stat.label),
      }))
    : defaultStats;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  // 语言切换时重置到第一张
  useEffect(() => {
    setCurrent(0);
  }, [locale]);

  return (
    <section
      // ⚠️ 刻意**不加** `tpl-section`（2026-09-15 实测决定）：
      //    Hero 是**全幅 banner**，不是内容区块。它的内容容器本身已有 `py-20 md:py-28`（=112px），
      //    再叠一层 `.tpl-section` 的 `padding: var(--section-pad)` 会形成**双重内边距**。
      //    浏览器实测（scripts/_browser_probe.js + scripts/_audit_style_risks.js）：
      //      t2-industrial（section-pad 88px）→ 外 88 + 内 112 = 上下各 200px，Hero 高 864px
      //      t3-carbon-black（section-pad 112px）→ 外 112 + 内 112 = 上下各 224px，Hero 高 912px
      //    区块节奏（spacing 字段）由下面 7 个内容区块承担即可；Hero 高度保持自有设计、不随皮肤浮动。
      className="tpl-hero relative overflow-hidden text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {slide.image ? (
            <>
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
              {isLegacyBg(slide) ? (
                <>

                  <div className="absolute inset-0 bg-black/35" />
                </>
              ) : (
                <div className="absolute inset-0" style={overlayStyle(slide)} />
              )}
            </>
          ) : isLegacyBg(slide) ? (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient}`} />
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-accent blur-3xl" />
                <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
              </div>
            </>
          ) : (
            <div className="absolute inset-0" style={bgStyle(slide)} />
          )}
        </div>
      ))}

      <div className="container relative py-20 md:py-28 min-h-[500px] flex items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {pickLang(slides[current].badge) || t("heroBadge")}
          </div>

          <h1 className="tpl-title mt-6 text-4xl font-bold leading-tight md:text-6xl">
            {slides[current].title}
            <br />
            <span className="text-accent">{slides[current].subtitle}</span>
          </h1>

          <p className="mt-6 text-lg text-white/80 md:text-xl">{slides[current].description}</p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={slides[current].ctaLink}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-primary transition hover:bg-gray-100"
            >
              {slides[current].ctaText}
              {isRtl ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
            </Link>
            <Link
              href="/contact"
              className="tpl-btn inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              {pickLang(slides[current].secondaryCtaText) || t("getSolution")}
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-accent">{stat.value}</div>
                <div className="mt-1 text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={prev}
        className={`absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30`}
        aria-label="Previous"
      >
        {isRtl ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </button>
      <button
        onClick={next}
        className={`absolute ${isRtl ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30`}
        aria-label="Next"
      >
        {isRtl ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-8 bg-accent" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
