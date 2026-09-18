"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface KitzBreadcrumbItem {
  label: string;
  href?: string;
}

interface KitzPageHeroProps {
  /** 顶部小字 eyebrow（如 "ULTRA HIGH PURITY"） */
  eyebrow: string;
  /** 大标题 */
  title: string;
  /** 副标题（可选） */
  subtitle?: string;
  /** 面包屑（最后一项高亮为当前页） */
  breadcrumb: KitzBreadcrumbItem[];
}

/**
 * KITZ SCT 风 · 内页顶部横幅
 *
 * 视觉：白底 + 极淡工程网格 + 直角 L 形框线（不用圆角，与整套主题的方形语言一致），
 *      细横线分隔的 eyebrow + 大标题 + 副标题，面包屑置于标题之上。
 */
export default function KitzPageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
}: KitzPageHeroProps) {
  const { locale } = useI18n();
  // 阿拉伯语为 RTL，面包屑分隔符要跟着换向，否则箭头指向与阅读方向相反
  const isRtl = locale === "ar";

  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      {/* 装饰层 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* 工程图纸网格（极淡，仅作质感，不抢正文） */}
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(30,41,59,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* L 形直角框线：左上实、右下淡（KITZ 方形语言） */}
        <div className="absolute start-0 top-0 h-14 w-14 border-s-2 border-t-2 border-primary md:h-20 md:w-20" />
        <div className="absolute bottom-0 end-0 h-14 w-14 border-b-2 border-e-2 border-primary/40 md:h-20 md:w-20" />
      </div>

      <div className="container relative py-14 lg:py-20">
        {/* 面包屑 */}
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 &&
                (isRtl ? (
                  <ChevronLeft size={14} className="text-gray-300" />
                ) : (
                  <ChevronRight size={14} className="text-gray-300" />
                ))}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-primary">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Eyebrow：小方块 + 大字距小字（方形标记而非圆点，呼应整套直角语言） */}
        <div className="mb-4 flex items-center gap-3">
          <span className="h-2 w-2 bg-primary" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {eyebrow}
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl">
          {title}
        </h1>

        {/* 副标题 */}
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
