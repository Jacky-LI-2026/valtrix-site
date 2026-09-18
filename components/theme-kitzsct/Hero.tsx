"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { useProductTabs } from "@/lib/api/useProducts";

interface KitzHeroSlide {
  /** 同屏静态图：既作 <img> 回退，也作 <video> 的 poster */
  image: string;
  /** 可选视频地址；为空串时**整段不渲染 <video>**，只走图片分支 */
  video: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  desc: string;
  ctaText: string;
  ctaLink: string;
}

/** 兜底帧的「半行高亮」标题，用 i18n 拼出两级标题结构 */
const FALLBACK_HERO_PARTS = [
  { titleKey: "kitzHeroFallbackTitle1", accentKey: "kitzHeroFallbackTitle2", descKey: "kitzHeroFallbackDesc1", image: "" },
  { titleKey: "kitzHeroFallbackTitle3", accentKey: "kitzHeroFallbackTitle4", descKey: "kitzHeroFallbackDesc2", image: "" },
  { titleKey: "kitzHeroFallbackTitle5", accentKey: "kitzHeroFallbackTitle6", descKey: "kitzHeroFallbackDesc3", image: "" },
  { titleKey: "kitzHeroFallbackTitle7", accentKey: "kitzHeroFallbackTitle8", descKey: "kitzHeroFallbackDesc4", image: "" },
] as const;

/** 轮播自动轮转间隔（毫秒） */
const SLIDE_INTERVAL_MS = 6000;

/**
 * KITZ SCT 日式工业风 — 首屏轮播（**视频优先、图片回退**）
 *
 * 数据源照抄 theme-unilok/Hero：`/api/public/home-config` 的 `banners`；
 * banners 为空时退回产品 Tab 帧（同样来自 `/api/public/products`）。
 *
 * ⚠️ 关于「无视频字段」的实测事实（见交付报告）：
 *   `prisma/schema.prisma` 的 `HomeConfig.banners` 注释为
 *   `[{image, title, subtitle, link, sortOrder}]` —— **没有任何视频字段**，
 *   `/api/public/home-config` 也只是把 Json 原样透出（不做字段补全）。
 *   本项目硬约束禁止改 schema / API，故此处**只读**探测可选字段
 *   `video` / `videoUrl`（后台若曾手写进 Json 就能生效）；
 *   两者都没有 ⇒ `video === ""` ⇒ **整段不渲染 `<video>`**，只显示图片。
 *
 * 无障碍：`<video>` 必须 muted + playsInline + loop + autoPlay（移动端浏览器
 * 才允许自动播放，且不会突然出声），并带 poster；屏幕阅读器把背景视频视为装饰
 * (`aria-hidden`)，语义信息全部由叠加的标题与 CTA 承担。
 */
export default function KitzHero() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const { productTabs } = useProductTabs();

  const [banners, setBanners] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // 取首页配置的 banners（与 UNILOK 同一接口、同一容错方式）
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

  /**
   * 构建轮播帧。
   * banner 的 title/subtitle 在 Json 里是**标量字符串**，所以 `loc.get` 可直接读；
   * 若后台把它们存成了 `{zh,en,...}` 对象，`getLocalizedField` 会 String() 出
   * `[object Object]` —— 该形态 lib/localized.ts 不支持，已在报告中列为待决项。
   */
  const slides: KitzHeroSlide[] = (() => {
    if (banners.length > 0) {
      return banners.slice(0, 5).map((b: any) => ({
        image: b?.image || "",
        // 只读探测：schema 未声明该字段，配置了才用，没配置就是空串
        video: b?.video || b?.videoUrl || "",
        eyebrow: t("kitzHeroEyebrow"),
        title: loc.get(b, "title") || t("kitzHeroFallbackTitle1"),
        titleAccent: loc.get(b, "subtitle") || t("kitzHeroFallbackTitle2"),
        desc: loc.get(b, "description"),
        ctaText: loc.get(b, "ctaText") || t("kitzHeroCta"),
        ctaLink: b?.link || b?.ctaLink || "/products",
      }));
    }
    // 无 banners：用产品 Tab 前 4 个作为帧（图片取自该 Tab 首个型号）
    return FALLBACK_HERO_PARTS.map((part, idx) => {
      const tab: any = productTabs[idx];
      const firstModel = tab?.categories?.[0]?.models?.[0];
      return {
        image: firstModel?.image || "",
        video: "",
        eyebrow: t("kitzHeroEyebrow"),
        title: tab ? loc.get(tab, "name") : t(part.titleKey),
        titleAccent: tab ? t(part.accentKey) : t(part.accentKey),
        desc: t(part.descKey),
        ctaText: t("kitzHeroCta"),
        ctaLink: tab ? `/products?tab=${tab.id}` : "/products",
      };
    });
  })();

  const total = slides.length;
  const slide = total > 0 ? slides[Math.min(current, total - 1)] : null;
  const hasVideo = Boolean(slide?.video);

  const goTo = useCallback(
    (index: number) => {
      if (total > 0) setCurrent(((index % total) + total) % total);
    },
    [total]
  );

  // 自动轮转：hover/focus 暂停，页面不可见时也暂停（省电、且避免后台播放视频）
  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % total), SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, total]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // 语种切换后回到第一帧，避免文案与帧错位
  useEffect(() => {
    setCurrent(0);
  }, [locale]);

  // 视频只在当前帧播放：切走的帧必须暂停，否则多路视频同时解码会拖垮首屏
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) {
      el.pause();
    } else {
      // play() 可能被自动播放策略拒绝，静默忽略即可（poster 仍在显示）
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }, [paused, current, hasVideo]);

  if (!slide) {
    // 数据未到位：留白占位，避免首屏塌陷导致 CLS
    return <section className="min-h-[560px] bg-gray-50" aria-hidden="true" />;
  }

  return (
    <section
      className="relative overflow-hidden bg-dark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("kitzHeroAria")}
    >
      {/* 背景层：视频优先 / 图片回退，两条分支并存于同一帧 */}
      <div className="absolute inset-0">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={slide.video}
            poster={slide.image || undefined}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : slide.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-800 to-dark-600" />
        )}

        {/* 压暗遮罩：保证白字在任何图上都达到可读对比度 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
        {/* 细分隔线网格 —— 日式工业风的「图纸感」，不做大圆角装饰 */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* 文本层 */}
      <div className="container relative flex min-h-[560px] items-center py-24 lg:min-h-[680px]">
        <div className="max-w-3xl text-white">
          {/* 小字 eyebrow + 细分隔线 */}
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              {slide.eyebrow}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
            {slide.title}
            {slide.titleAccent && (
              <>
                <br />
                <span className="font-light">{slide.titleAccent}</span>
              </>
            )}
          </h1>

          {slide.desc && (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">{slide.desc}</p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={slide.ctaLink}
              className="group inline-flex items-center gap-2 bg-white px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-dark transition-colors hover:bg-gray-200"
            >
              {slide.ctaText}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl-flip" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-white/50 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-white/10"
            >
              {t("kitzHeroCta2")}
            </Link>
          </div>
        </div>
      </div>

      {/* 指示器：当前帧为细进度条，其余为小圆点 */}
      {total > 1 && (
        <div className="absolute bottom-8 left-0 right-0 z-10">
          <div className="container flex items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${t("kitzSlide")} ${i + 1}`}
                  aria-current={i === current}
                  className={`h-[3px] transition-all duration-300 ${
                    i === current ? "w-12 bg-white" : "w-5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs tracking-widest text-white/70">
              {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
