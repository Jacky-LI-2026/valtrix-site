"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface UnilokBreadcrumbItem {
  label: string;
  href?: string;
}

interface UnilokPageHeroProps {
  /** 顶部小字 eyebrow（如 "PRECISION FLUID CONTROL"） */
  eyebrow: string;
  /** 大标题 */
  title: string;
  /** 副标题（可选） */
  subtitle?: string;
  /** 面包屑（最后一项高亮为当前页） */
  breadcrumb: UnilokBreadcrumbItem[];
}

/**
 * UNILOK 精密工业风 · 内页顶部横幅
 * 浅灰底 + 大字标题 + eyebrow + 面包屑，L 形角标装饰与右侧渐变光晕
 */
export default function UnilokPageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
}: UnilokPageHeroProps) {
  const { locale } = useI18n();
  const isRtl = locale === "ar";

  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-dark-50">
      {/* 装饰层 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* L 形角标：左上橙红 */}
        <div className="absolute top-0 start-0 h-16 w-16 border-s-2 border-t-2 border-accent" />
        {/* L 形角标：右下橙红（淡） */}
        <div className="absolute bottom-0 end-0 h-16 w-16 border-b-2 border-e-2 border-accent/50" />
        {/* 工程图纸网格 */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(26,26,46,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,46,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* 右侧渐变光晕 */}
        <div className="absolute -top-24 end-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative py-14 lg:py-20">
        {/* 面包屑 */}
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-dark-400">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 &&
                (isRtl ? (
                  <ChevronLeft size={14} className="text-dark-300" />
                ) : (
                  <ChevronRight size={14} className="text-dark-300" />
                ))}
              {item.href ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-primary">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <span className="h-0.5 w-8 bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl">
          {title}
        </h1>

        {/* 副标题 */}
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-dark-500 md:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
