"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

interface PageHeroProps {
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  breadcrumb: string;
  breadcrumbEn?: string;
  /** 可选：直接传入配置，不传则自动按路径从 API 读取 */
  config?: PageHeroConfig;
}

export interface PageHeroConfig {
  backgroundImage?: string;
  overlayColor: string;
  overlayOpacity: number;
  gradientEnabled: boolean;
  gradientDirection: "to-bottom" | "to-top" | "to-left" | "to-right" | "to-bottom-right" | "to-bottom-left";
  gradientColor2: string;
  patternEnabled: boolean;
}

const DEFAULT_CONFIG: PageHeroConfig = {
  overlayColor: "#0a0a0a",
  overlayOpacity: 0.35,
  gradientEnabled: false,
  gradientDirection: "to-bottom",
  gradientColor2: "#1a1a2e",
  patternEnabled: true,
};

// 渐变方向映射
const GRADIENT_DIR: Record<string, string> = {
  "to-bottom": "to bottom",
  "to-top": "to top",
  "to-left": "to left",
  "to-right": "to right",
  "to-bottom-right": "to bottom right",
  "to-bottom-left": "to bottom left",
};

export default function PageHero({ title, titleEn, subtitle, subtitleEn, breadcrumb, breadcrumbEn, config }: PageHeroProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const isRtl = locale === "ar";
  const [heroConfig, setHeroConfig] = useState<PageHeroConfig>(config || DEFAULT_CONFIG);

  // 如果没有传入 config，自动按路径从 API 读取
  useEffect(() => {
    if (config) {
      setHeroConfig(config);
      return;
    }
    fetch(`/api/public/site-config?key=page_hero_config`)
      .then((r) => r.json())
      .then((res) => {
        const raw = res?.data;
        if (raw) {
          try {
            const all = typeof raw === 'string' ? JSON.parse(raw) : raw;
            // 精确匹配路径，或匹配前缀（如 /industries/jewelry 匹配 /industries）
            const match = all[pathname] || findPrefixMatch(all, pathname);
            if (match) {
              setHeroConfig({ ...DEFAULT_CONFIG, ...match });
            }
          } catch (e) {
            // 解析失败用默认
          }
        }
      })
      .catch(() => {});
  }, [pathname, config]);

  const cfg = heroConfig;

  // 构建遮罩层样式
  const overlayStyle: React.CSSProperties = {};
  if (cfg.gradientEnabled) {
    const dir = GRADIENT_DIR[cfg.gradientDirection] || "to bottom";
    overlayStyle.background = `linear-gradient(${dir}, ${hexToRgba(cfg.overlayColor, cfg.overlayOpacity)}, ${hexToRgba(cfg.gradientColor2, cfg.overlayOpacity)})`;
  } else {
    overlayStyle.backgroundColor = hexToRgba(cfg.overlayColor, cfg.overlayOpacity);
  }

  return (
    <section className="relative pt-16 lg:pt-20 pb-12 lg:py-16 bg-dark-900 overflow-hidden">
      {/* 背景图（最下层） */}
      {cfg.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cfg.backgroundImage})` }}
        />
      )}
      {/* 遮罩层（纯色或渐变，在背景图上层） */}
      <div className="absolute inset-0" style={overlayStyle} />
      {/* 网格图案 */}
      {cfg.patternEnabled && (
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
      )}
      {/* 光晕效果 */}
      {!cfg.backgroundImage && (
        <div className="absolute -top-1/2 end-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
      )}

      <div className="container relative">
        <nav className="flex items-center gap-2 text-sm text-dark-300 mb-6">
          <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home size={14} />
            {t("home")}
          </Link>
          {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          <span className="text-primary">{breadcrumb}</span>
        </nav>

        <div className="w-16 h-1 bg-primary mb-6" />
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
          {title}
        </h1>
        {(subtitle || subtitleEn) && (
          <p className="text-lg text-dark-300 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

// 工具：hex 转 rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 工具：前缀匹配（找最长的匹配前缀）
function findPrefixMatch(all: Record<string, any>, pathname: string): any {
  let best: any = null;
  let bestLen = 0;
  for (const key of Object.keys(all)) {
    if (pathname.startsWith(key) && key.length > bestLen) {
      best = all[key];
      bestLen = key.length;
    }
  }
  return best;
}
