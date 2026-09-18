"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

interface KitzProductCardProps {
  /** 产品型号对象（ProductModel） */
  product: any;
  /** 所属 Tab（产品系列）id，用于生成详情链接 /products/[tab]/[id] */
  tabId: string;
}

/**
 * KITZ SCT 风 · 产品卡片
 *
 * 视觉：方形图位（aspect-square，与整套直角/方形语言一致）+ 型号标签 + 名称 + 描述 + 至多 3 条关键参数。
 * 多语言取值一律走 lib/localized 口径；型号字段可能是数组，故经 textOr 统一转文本。
 */
export default function KitzProductCard({ product, tabId }: KitzProductCardProps) {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);

  // 图片：单图字段优先，其次图集首张；都没有则走占位图
  const img =
    typeof product.image === "string" && product.image
      ? product.image
      : Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : "";

  const specs: any[] = Array.isArray(product.specs) ? product.specs : [];

  return (
    <Link
      href={`/products/${tabId}/${product.id}`}
      className="group flex flex-col border border-gray-200 bg-white transition-colors hover:border-primary"
    >
      {/* 图位 + 型号标签 */}
      <div className="relative aspect-square overflow-hidden border-b border-gray-100 bg-gray-50">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={loc.get(product, "name")}
            loading="lazy"
            className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/placeholders/generic-tech.webp"
            alt={loc.get(product, "name")}
            loading="lazy"
            className="h-full w-full object-cover opacity-80"
          />
        )}
        {textOr(loc.get(product, "model")) && (
          <span className="absolute start-0 top-0 bg-primary px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-white">
            {textOr(loc.get(product, "model"))}
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-dark transition-colors group-hover:text-primary">
          {loc.get(product, "name")}
        </h3>
        <p className="mb-4 mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
          {loc.get(product, "description")}
        </p>

        {/* 关键参数（至多 3 条）：无参数时整块不渲染，避免留下空分隔线 */}
        {specs.length > 0 && (
          <div className="mb-5 space-y-1.5 border-t border-gray-100 pt-4">
            {specs.slice(0, 3).map((spec: any, index: number) => (
              <div key={spec.label || index} className="flex justify-between gap-3 text-xs">
                <span className="text-gray-500">{loc.get(spec, "label")}</span>
                <span className="text-end font-medium text-dark">
                  {textOr(loc.get(spec, "value"))}
                </span>
              </div>
            ))}
          </div>
        )}

        <span className="mt-auto inline-flex items-center gap-1 border-t border-gray-100 pt-4 text-sm font-semibold text-primary transition-all group-hover:gap-2">
          {t("viewDetails")}
          <ArrowRight size={14} className="rtl-flip" />
        </span>
      </div>
    </Link>
  );
}

/** 数组/字符串统一转文本：型号与参数值可能是数组，直接渲染会报错 */
function textOr(v: any): string {
  if (Array.isArray(v)) return v.join(" ");
  return String(v || "");
}
