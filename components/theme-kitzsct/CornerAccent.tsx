"use client";

/**
 * KITZ SCT 风 · 装饰件：L 形直角框线（左上主色实线 → 右下主色淡线）
 * 用法：放在 relative 容器内作为叠加装饰层；整套主题用直角而非圆角。
 */
export default function KitzCornerAccent({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <span className="absolute start-0 top-0 h-5 w-5 border-s-2 border-t-2 border-primary md:h-7 md:w-7" />
      <span className="absolute bottom-0 end-0 h-5 w-5 border-b-2 border-e-2 border-primary/50 md:h-7 md:w-7" />
    </div>
  );
}
