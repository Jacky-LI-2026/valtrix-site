"use client";

import { useI18n } from "@/lib/i18n";

/**
 * KITZ SCT 日式工业风 — 核心能力卡组
 *
 * 4 张**细线框图标卡**，用 1px 间隙 + 灰底构成分隔线（不做阴影卡片、不做大圆角），
 * 与 Downloads / Industries 保持同一栅格语言。
 *
 * 图标为内联 `<svg>`（改自 UNILOK Capabilities 的线框风格）：
 * 只保留几何感强的路径，描边统一 1.25，颜色跟随文字色以便 hover 反白。
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

/** 工程与设计：圆规/图纸 */
function IconEngineering() {
  return (
    <svg {...iconProps}>
      <path d="M12 3 3 21" />
      <path d="M12 3l9 18" />
      <path d="M7 13h10" />
      <circle cx="12" cy="5" r="1.5" />
    </svg>
  );
}

/** 精密制造：齿轮 */
function IconManufacturing() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </svg>
  );
}

/** 洁净与品控：盾牌 + 对勾 */
function IconQuality() {
  return (
    <svg {...iconProps}>
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** 服务与支持：循环箭头 */
function IconSupport() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a9 9 0 1 1-3.2-6.9" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

const CAPS = [
  { key: "kitzCap1Title", desc: "kitzCap1Desc", Icon: IconEngineering },
  { key: "kitzCap2Title", desc: "kitzCap2Desc", Icon: IconManufacturing },
  { key: "kitzCap3Title", desc: "kitzCap3Desc", Icon: IconQuality },
  { key: "kitzCap4Title", desc: "kitzCap4Desc", Icon: IconSupport },
] as const;

export default function KitzCapabilities() {
  const { t } = useI18n();

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-dark" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dark-400">
              {t("kitzCapEyebrow")}
            </span>
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-dark md:text-4xl">
            {t("kitzCapTitle")}
          </h2>
          <p className="mt-4 text-dark-500">{t("kitzCapSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map(({ key, desc, Icon }) => (
            <div
              key={key}
              className="group relative bg-white p-8 transition-colors duration-300 hover:bg-gray-50"
            >
              <div className="text-dark transition-transform duration-300 group-hover:-translate-y-0.5">
                <Icon />
              </div>
              <h3 className="mt-6 text-base font-bold tracking-tight text-dark">{t(key)}</h3>
              <div className="mt-3 h-px w-8 bg-dark transition-all duration-300 group-hover:w-14" />
              <p className="mt-4 text-sm leading-relaxed text-dark-500">{t(desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
