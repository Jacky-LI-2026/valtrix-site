"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export interface PageHeroConfig {
  backgroundImage?: string;
  overlayColor: string;
  overlayOpacity: number;
  gradientEnabled: boolean;
  gradientDirection: string;
  gradientColor2: string;
  patternEnabled: boolean;
}

const DEFAULT_CONFIG: PageHeroConfig = {
  overlayColor: "#0a0a0a",
  overlayOpacity: 0.45,
  gradientEnabled: false,
  gradientDirection: "to-bottom",
  gradientColor2: "#1a1a2e",
  patternEnabled: true,
};

const GRADIENT_DIR: Record<string, string> = {
  "to-bottom": "to bottom",
  "to-top": "to top",
  "to-left": "to left",
  "to-right": "to right",
  "to-bottom-right": "to bottom right",
  "to-bottom-left": "to bottom left",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

/**
 * 获取当前页面的头部配置
 * 优先精确匹配路径，其次前缀匹配（如 /industries 匹配 /industries/jewelry）
 */
export function usePageHeroConfig(): PageHeroConfig {
  const pathname = usePathname();
  const [config, setConfig] = useState<PageHeroConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetch(`/api/public/site-config?key=page_hero_config`)
      .then((r) => r.json())
      .then((res) => {
        const raw = res?.data;
        if (raw) {
          try {
            const all = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const match = all[pathname] || findPrefixMatch(all, pathname);
            if (match) {
              setConfig({ ...DEFAULT_CONFIG, ...match });
            } else {
              setConfig(DEFAULT_CONFIG);
            }
          } catch {
            setConfig(DEFAULT_CONFIG);
          }
        } else {
          setConfig(DEFAULT_CONFIG);
        }
      })
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, [pathname]);

  return config;
}

/**
 * 计算遮罩层样式
 */
export function getOverlayStyle(cfg: PageHeroConfig): React.CSSProperties {
  if (cfg.gradientEnabled) {
    const dir = GRADIENT_DIR[cfg.gradientDirection] || "to bottom";
    return {
      background: `linear-gradient(${dir}, ${hexToRgba(cfg.overlayColor, cfg.overlayOpacity)}, ${hexToRgba(cfg.gradientColor2, cfg.overlayOpacity)})`,
    };
  }
  return { backgroundColor: hexToRgba(cfg.overlayColor, cfg.overlayOpacity) };
}

/**
 * 通用头部背景组件
 * 放在头部 section 内的最前面，自动渲染背景图+遮罩层+网格图案
 */
export function HeroBackground({ config }: { config?: PageHeroConfig }) {
  const autoConfig = usePageHeroConfig();
  const cfg = config || autoConfig;

  return (
    <>
      {/* 背景图（最下层） */}
      {cfg.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cfg.backgroundImage})` }}
        />
      )}
      {/* 遮罩层 */}
      <div className="absolute inset-0" style={getOverlayStyle(cfg)} />
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
    </>
  );
}
