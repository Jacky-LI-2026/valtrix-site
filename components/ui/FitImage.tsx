"use client";

/**
 * 产品图统一渲染（**透明背景的长方形图不裁切**）
 * ==========================================================================
 * owner 2026-10-07：
 *   「透明背景的图片，如果是长方形，不要切割图片，按长和宽的数值的最大值补齐图片为正方形」
 *
 * 背景：产品图历史上统一按 `object-cover`（铺满）显示 —— 对**方形**图没问题
 *   （`1000×1000` 的图不会被裁），但**长方形 + 透明背景**的渲染图会被裁掉两端。
 *
 * 判定（浏览器内，按 URL 缓存结果）：
 *   · 把已加载的 `<img>` 画进 24×24 的 canvas，采样 alpha；
 *   · **四角都接近全透明** 且 整体透明像素占比 > 5% ⇒ 认为是"透明背景渲染图"；
 *   · 跨域图（外链）取不到像素 / 任何异常 ⇒ 一律**按旧行为 `object-cover`**，不改变现状。
 * 透明图 → `object-contain`（等价于"按长宽最大值补齐成正方形"：图完整、四周由容器底色补齐）。
 *
 * ⚠️ 2026-10-07 owner 复核：**这套判定是对的** —— 当时 G 系列卡看起来仍被裁，
 *   是因为那张图本身不是透明底（`1600×1045` 不透明）⇒ owner 选择**重新上传该图**，
 *   而不是把规则改成"一律 contain"。故此处保持"按透明底判定"不变。
 *
 * 同时统一了**加载失败的兜底**：沿 `fallbackSrc` 回退链走，最后一项按占位图半透明内缩显示 ——
 *   调用方不要再自己写 `object-cover/object-contain`，也不要再各自写一遍 onError。
 */
import { useMemo, useState } from "react";

/** 透明背景判定结果缓存（同一个 URL 只算一次） */
const alphaCache = new Map<string, boolean>();

/** 采样判断：这张已加载的图是不是"透明背景" */
export function hasTransparentBackground(img: HTMLImageElement | null, cacheKey?: string): boolean {
  if (!img) return false;
  if (cacheKey && alphaCache.has(cacheKey)) return alphaCache.get(cacheKey)!;
  let result = false;
  try {
    const SIDE = 24;
    const canvas = document.createElement("canvas");
    canvas.width = SIDE;
    canvas.height = SIDE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, SIDE, SIDE);
      // 直接拉伸到 24×24：只关心"哪里透明"，比例失真无所谓
      ctx.drawImage(img, 0, 0, SIDE, SIDE);
      const { data } = ctx.getImageData(0, 0, SIDE, SIDE);
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 16) transparent += 1;
      const cornerAlpha = (x: number, y: number) => data[(y * SIDE + x) * 4 + 3];
      const corners = [cornerAlpha(0, 0), cornerAlpha(SIDE - 1, 0), cornerAlpha(0, SIDE - 1), cornerAlpha(SIDE - 1, SIDE - 1)];
      result = Math.max(...corners) < 16 && transparent / (SIDE * SIDE) > 0.05;
    }
  } catch {
    // 跨域 / canvas 被污染 / 未解码完 —— 保持旧行为（cover）
    result = false;
  }
  if (cacheKey) alphaCache.set(cacheKey, result);
  return result;
}

export interface FitImageProps {
  src: string;
  alt: string;
  /** 尺寸/布局类（**不要**传 object-cover / object-contain，由本组件决定） */
  className?: string;
  /**
   * 加载失败时**按顺序**回退的候选地址（最后一个通常传本站 LOGO 占位）。
   * 例：缩略图 `_thumb.webp` 常常不存在 ⇒ 传 `[原图, LOGO]`：
   *   先退到原图，原图也失败才显示 LOGO 占位。
   */
  fallbackSrc?: string | string[];
  loading?: "lazy" | "eager";
  draggable?: boolean;
  style?: React.CSSProperties;
}

export default function FitImage({ src, alt, className = "", fallbackSrc, loading, draggable, style }: FitImageProps) {
  /** 回退链：`[src, ...fallbackSrc]`；最后一项视为"占位图"（半透明内缩显示） */
  const chain = useMemo(() => {
    const extra = Array.isArray(fallbackSrc) ? fallbackSrc : fallbackSrc ? [fallbackSrc] : [];
    return [src, ...extra.filter(Boolean)];
  }, [src, fallbackSrc]);
  const [idx, setIdx] = useState(0);
  const [contain, setContain] = useState(false);
  const current = chain[Math.min(idx, chain.length - 1)];
  /** 已经退到最后一项（占位图）：用"半透明 + 内缩 + contain"的占位观感 */
  const isPlaceholder = idx > 0 && idx === chain.length - 1;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={current}
      src={current}
      alt={alt}
      loading={loading}
      draggable={isPlaceholder ? false : draggable}
      className={`${className} ${isPlaceholder || contain ? "object-contain" : "object-cover"} ${
        isPlaceholder ? "p-[12%] opacity-[0.45]" : ""
      }`}
      style={style}
      onLoad={(e) => {
        // 透明背景的长方形图不裁切（方形图 contain/cover 等价，切过去也无副作用）
        if (!isPlaceholder && hasTransparentBackground(e.currentTarget, current)) setContain(true);
      }}
      onError={() => {
        // 沿回退链往下走；已在最后一项就停住（不会死循环）
        setIdx((i) => (i < chain.length - 1 ? i + 1 : i));
      }}
    />
  );
}
