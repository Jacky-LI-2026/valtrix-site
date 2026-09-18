"use client";

import Link from "next/link";
import { FileText, BookOpen, Award, Ruler, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * KITZ SCT 日式工业风 — 资料下载栅格（**新组件**）
 *
 * 4 个方形图标格：图标 + 标题 + 说明，全部指向站内 `/resources`。
 *
 * ⚠️ 为什么不做参考站的 `/document#anchorNN`：
 *   Base 仓**没有 `/document` 路由**（实测 `app/` 下只有 `app/resources/page.tsx`
 *   与 `app/resources/[type]/page.tsx`）。照搬会得到 404，故统一落到 `/resources`。
 *
 * 图标用内联 `<svg>`（与 UNILOK 的 Capabilities 同做法）：避免为了 4 个图标
 * 引入新依赖，也让线宽/描边完全服从本站设计语言。
 */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-8 w-8",
  "aria-hidden": true,
};

/** 技术资料：文档 + 折角 */
function IconDocument() {
  return (
    <svg {...iconProps}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

/** 产品目录：书册 */
function IconCatalog() {
  return (
    <svg {...iconProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M9 7h7" />
    </svg>
  );
}

/** 资质认证：奖章 */
function IconCertificate() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14.2 7 22l5-2.6 5 2.6-1.5-7.8" />
    </svg>
  );
}

/** 工程图纸：标尺 */
function IconDrawing() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="7" width="20" height="10" rx="1" />
      <path d="M6 7v3M10 7v4M14 7v3M18 7v4" />
    </svg>
  );
}

const TILES = [
  { key: "kitzDownloadsItem1", desc: "kitzDownloadsItem1Desc", Icon: IconDocument },
  { key: "kitzDownloadsItem2", desc: "kitzDownloadsItem2Desc", Icon: IconCatalog },
  { key: "kitzDownloadsItem3", desc: "kitzDownloadsItem3Desc", Icon: IconCertificate },
  { key: "kitzDownloadsItem4", desc: "kitzDownloadsItem4Desc", Icon: IconDrawing },
] as const;

export default function KitzDownloads() {
  const { t } = useI18n();
  // 站内资料中心：Base 只有 /resources（无 /document），四格全部指向它
  const href = "/resources";

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dark" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
                {t("kitzDownloadsEyebrow")}
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-dark md:text-4xl">
              {t("kitzDownloadsTitle")}
            </h2>
            <p className="mt-4 text-dark-500">{t("kitzDownloadsSubtitle")}</p>
          </div>
          <Link
            href={href}
            className="group inline-flex items-center gap-2 border border-dark px-6 py-3 text-sm font-semibold uppercase tracking-wider text-dark transition-colors hover:bg-dark hover:text-white"
          >
            {t("kitzDownloadsMore")}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl-flip" />
          </Link>
        </div>

        {/* 4 格方形栅格：用 1px 间隙 + 灰底模拟细分隔线，避免圆角 */}
        <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map(({ key, desc, Icon }) => (
            <Link
              key={key}
              href={href}
              className="group relative bg-white p-8 transition-colors duration-300 hover:bg-gray-50"
            >
              <div className="flex h-16 w-16 items-center justify-center border border-gray-200 text-dark transition-colors duration-300 group-hover:border-dark group-hover:bg-dark group-hover:text-white">
                <Icon />
              </div>
              <h3 className="mt-6 text-base font-bold tracking-tight text-dark">{t(key)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-dark-500">{t(desc)}</p>
              <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-dark transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
