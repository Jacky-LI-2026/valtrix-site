"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-12 w-12",
  "aria-hidden": true,
};

/** 工程设计：标尺/图纸 */
function IconDesign() {
  return (
    <svg {...iconBase}>
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}

/** 先进制造：齿轮 */
function IconManufacturing() {
  return (
    <svg {...iconBase}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** 物料管理：分层/可追溯 */
function IconMaterial() {
  return (
    <svg {...iconBase}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

/** 质量保证：盾牌 + 对勾 */
function IconQuality() {
  return (
    <svg {...iconBase}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const CAPS = [
  { key: "unilokCap1Title", desc: "unilokCap1Desc", Icon: IconDesign },
  { key: "unilokCap2Title", desc: "unilokCap2Desc", Icon: IconManufacturing },
  { key: "unilokCap3Title", desc: "unilokCap3Desc", Icon: IconMaterial },
  { key: "unilokCap4Title", desc: "unilokCap4Desc", Icon: IconQuality },
] as const;

/**
 * UNILOK 精密工业风 — Capabilities 核心能力（4 列线框图标卡片）
 */
export default function Capabilities() {
  const { t } = useI18n();

  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="container">
        <div className="mb-14 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              {t("unilokCapTitle")}
            </span>
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            {t("unilokCapTitle")}
          </h2>
          <p className="mt-4 text-dark-500">{t("unilokCapSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map(({ key, desc, Icon }) => (
            <div
              key={key}
              className="group relative bg-white p-8 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(15,52,96,0.08)]"
            >
              <div className="text-accent transition-transform duration-300 group-hover:scale-105">
                <Icon />
              </div>
              <h3 className="mt-6 text-lg font-bold text-primary">{t(key)}</h3>
              <div className="mt-3 h-px w-8 bg-accent transition-all duration-300 group-hover:w-14" />
              <p className="mt-4 text-sm leading-relaxed text-dark-500">{t(desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
