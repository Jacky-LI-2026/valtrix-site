"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

interface UnilokProductCardProps {
  /** 产品型号对象（ProductModel） */
  product: any;
  /** 所属 Tab（产品系列）id，用于生成详情链接 /products/[tab]/[id] */
  tabId: string;
}

/**
 * UNILOK 精密工业风 · 产品卡片
 * 产品图 + 型号标签 + 名称 + 描述 + 3 条关键参数 + 查看详情链接
 */
export default function UnilokProductCard({
  product,
  tabId,
}: UnilokProductCardProps) {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const img =
    typeof product.image === "string" && product.image
      ? product.image
      : Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : "";

  return (
    <Link
      href={`/products/${tabId}/${product.id}`}
      className="group flex flex-col overflow-hidden border border-gray-200 bg-white transition-colors hover:border-accent"
    >
      {/* 产品图 + 型号标签 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-50">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={loc.get(product, "name")}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
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
        <span className="absolute top-3 start-3 bg-primary px-2.5 py-1 text-xs font-bold text-white">
          {product.model}
        </span>
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-2 text-lg font-bold text-dark transition-colors group-hover:text-primary">
          {loc.get(product, "name")}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-dark-500">
          {loc.get(product, "description")}
        </p>

        {/* 关键参数（前 3 条） */}
        {Array.isArray(product.specs) && product.specs.length > 0 && (
          <div className="mb-5 space-y-1.5 border-t border-gray-100 pt-4">
            {(product.specs as any[])
              .slice(0, 3)
              .map((spec: any, index: number) => (
                <div
                  key={spec.label || index}
                  className="flex justify-between gap-3 text-xs"
                >
                  <span className="text-dark-400">{loc.get(spec, "label")}</span>
                  <span className="font-medium text-dark-700">
                    {loc.get(spec, "value")}
                  </span>
                </div>
              ))}
          </div>
        )}

        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all group-hover:gap-2">
          {t("viewDetails")}
          <ArrowRight size={14} className="rtl-flip" />
        </span>
      </div>
    </Link>
  );
}
