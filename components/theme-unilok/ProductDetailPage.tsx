"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  Download,
  FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { preserveLeadingSpaces } from "@/lib/rich-text";
import { groupSpecs } from "@/lib/spec-grouping";
import { getBrandNameEn } from "@/lib/brand";
import { useProductBySlug } from "@/lib/api/useProducts";
import UnilokPageHero from "./PageHero";
import UnilokProductCard from "./ProductCard";

// 产品手册兜底路径：走部署级 env（NEXT_PUBLIC_PRODUCT_MANUAL_URL）。
// ⚠️ 此前写死为阀门站的 /downloads/valtrix-product-catalog-2026.pdf —— 左文站上该文件
//    是遗留的阀门手册，且 G2 禁止把站点差异写死在代码里（2026-09-14 修复）。
//     左文：/downloads/zuowen-product-manual.pdf
//     阀门：/downloads/valtrix-product-catalog-2026.pdf
const DEFAULT_MANUAL_URL = process.env.NEXT_PUBLIC_PRODUCT_MANUAL_URL || "";

/**
 * UNILOK 精密工业风 · 产品详情页
 * PageHero（产品名+型号）+ 产品图/参数表布局 + 特点列表 + 相关产品
 */
export default function UnilokProductDetailPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const modelId = params?.id as string;

  // ⚠️ 2026-09-15 性能修复（与 theme-kitzsct/ProductDetailPage.tsx 同一处、同一原因）：
  //   原实现把渲染门闩压在「全量产品树」上。实测阀门站 `/api/public/products` = **3.55MB / 12–98s**，
  //   而 `/api/public/products/<型号>` 只要 **0.23MB** 且**响应里已带 `tab` 与 `category`**。
  //   ⇒ 详情页被全量列表拖到 90 秒仍在转圈（线上实测）。
  //   现改为：**首选单产品接口**，全量列表降级为「兜底 + 相关产品」；任一数据源回来即渲染。
  // ⚠️ 2026-09-18：**不再拉全量产品树**。
  //   本页只需要「当前型号」+「同分类的相关产品」，而后者的 6 条已随详情接口一起返回
  //   （`/api/public/products/<slug>` 的 `related`）。原先为了相关产品要额外拉一棵
  //   含**全部型号六语种正文**（约 64% 体积）的产品树 ⇒ 详情页是当时最重的页面。
  //   现在详情页只发**一个**请求。
  const { product: detailProduct, loading: detailLoading } = useProductBySlug(modelId);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setImgIdx(0);
  }, [modelId]);

  // 唯一数据源：单产品接口（自带 tab / category / specs / features / detailContent / related）。
  // 接口失败时 `useProductBySlug` 内部会回退到静态数据，并同样补齐 tab/category/related。
  const dp: any = detailProduct;
  const info: { model: any; category: any; tab: any } | null =
    dp && dp.id && dp.tab && dp.category
      ? { model: dp, category: dp.category, tab: dp.tab }
      : null;

  // 同步浏览器标签页标题（必须在所有提前 return 之前，遵守 React Hooks 规则）
  useEffect(() => {
    if (!info) return;
    const name = loc.get(info.model, "name");
    document.title = `${name} - ${getBrandNameEn()}`;
  }, [info, loc]);

  // 详情接口还没回来 → 加载态；回来后仍无数据（404）→ 走下面的「产品不存在」
  if (!info && detailLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-dark">
            {t("productNotFound")}
          </h1>
          <Link href="/products" className="text-accent hover:underline">
            {t("backToProducts")}
          </Link>
        </div>
      </div>
    );
  }

  const { model, category, tab } = info;

  const images = [model.image, ...(Array.isArray(model.images) ? model.images : [])]
    .map((x: any) => (typeof x === "string" ? x : x?.url || ""))
    .filter(Boolean);
  const currentImage = images[imgIdx] || images[0] || "";
  const specs =
    detailProduct?.specs && detailProduct.specs.length > 0
      ? detailProduct.specs
      : model.specs || [];
  // 规格表按 label 分组（同 label 多尺寸值合并 label 单元格，rowSpan 跨行）
  const groupedSpecs = groupSpecs(specs, loc);
  const features = loc.getArray(model, "features");
  const detailContent = loc.get(model, "detailContent");
  // 相关产品：来自详情接口的 `related`（同分类其它已发布型号，服务端已按站点过滤并排好序）。
  // 拿不到就是空数组 —— 下方 `relatedModels.length > 0` 守卫会让该区块自然隐藏。
  const relatedModels = (Array.isArray(dp?.related) ? dp.related : []).slice(0, 3);
  const manualUrl = model?.manualUrl || DEFAULT_MANUAL_URL;

  return (
    <div className="bg-white">
      {/* PageHero：产品名 + 型号 */}
      <UnilokPageHero
        eyebrow={loc.get(tab, "name")}
        title={loc.get(model, "name")}
        subtitle={`${t("unilokModelLabel")} · ${model.model}`}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("products"), href: "/products" },
          { label: loc.get(category, "name"), href: `/products?tab=${tab.id}` },
          { label: model.model },
        ]}
      />

      {/* 主区：图 + 信息 */}
      <section className="bg-white py-14 lg:py-20">
        <div className="container">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
            {/* 图片区 */}
            <div className="lg:sticky lg:top-24">
              <div className="relative aspect-[4/3] overflow-hidden border border-gray-200 bg-dark-50">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={`${loc.get(model, "name")} - ${model.model}`}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-4xl font-bold text-primary">
                      {String(model.model || "V").charAt(0)}
                    </span>
                  </div>
                )}
                <span className="absolute top-4 start-4 bg-primary px-3 py-1.5 text-sm font-bold text-white">
                  {model.model}
                </span>
                {/* L 形角标 */}
                <span className="pointer-events-none absolute top-0 start-0 h-10 w-10 border-s-2 border-t-2 border-accent" />
              </div>

              {/* 缩略图 */}
              {images.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {images.map((img: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setImgIdx(index)}
                      className={`aspect-square w-20 shrink-0 overflow-hidden border transition-colors ${
                        index === imgIdx
                          ? "border-accent"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      aria-label={`${t("view")} ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${model.model} ${index + 1}`}
                        className="h-full w-full object-contain bg-dark-50"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 信息区 */}
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="border border-accent/40 bg-accent/5 px-3 py-1 text-sm font-medium text-accent">
                  {loc.get(category, "name")}
                </span>
                <span className="bg-dark-50 px-3 py-1 text-sm font-medium text-dark-600">
                  {loc.get(tab, "name")}
                </span>
              </div>
              <h2 className="mb-2 text-3xl font-bold text-dark lg:text-4xl">
                {loc.get(model, "name")}
              </h2>
              <p className="mb-6 text-xl font-semibold text-primary">
                {model.model}
              </p>
              <p className="mb-8 text-lg leading-relaxed text-dark-600">
                {loc.get(model, "description")}
              </p>

              {/* 关键特性 */}
              {features.length > 0 && (
                <div className="mb-10">
                  <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-dark">
                    <span className="h-6 w-1 bg-accent" />
                    {t("keyFeatures")}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {features.map((feature: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 border border-gray-100 bg-dark-50 p-3"
                      >
                        <CheckCircle
                          size={18}
                          className="mt-0.5 shrink-0 text-accent"
                        />
                        <span className="text-sm text-dark-700">
                          {String(feature)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 技术规格表 */}
              {specs.length > 0 && (
                <div className="mb-10">
                  <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-dark">
                    <span className="h-6 w-1 bg-accent" />
                    {t("technicalSpecs")}
                  </h3>
                  <div className="overflow-x-auto">
                    <div className="overflow-hidden border border-gray-200">
                      <table className="w-full min-w-[480px]">
                      <tbody>
                        {groupedSpecs.map((group, gi) =>
                          group.values.map((value, vi) => (
                            <tr
                              key={`${group.key}-${vi}`}
                              className={(gi + vi) % 2 === 0 ? "bg-white" : "bg-dark-50"}
                            >
                              {vi === 0 && (
                                <td rowSpan={group.values.length} className="w-2/5 border-b border-gray-100 px-5 py-3 text-sm text-dark-500">
                                  {group.label}
                                </td>
                              )}
                              <td className="border-b border-gray-100 px-5 py-3 text-sm font-medium text-dark-800">
                                {value}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 手册下载：无有效 URL 时整块隐藏（避免 href="" 坏链）。
                  兜底路径走部署级 env（G2：站点差异走配置，不得写死文件路径）。 */}
              {manualUrl && (
              <a
                href={manualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mb-10 inline-flex w-full items-center gap-4 border border-gray-200 bg-dark-50 px-6 py-4 transition-colors hover:border-accent sm:w-auto"
              >
                <span className="flex h-10 w-10 items-center justify-center border border-accent/40 bg-accent/5">
                  <FileText size={20} className="text-accent" />
                </span>
                <span className="flex-1 text-start">
                  <span className="block font-bold text-dark">
                    {t("downloadProductManual")}
                  </span>
                  <span className="block text-xs text-dark-400">
                    {t("pdfFormatSpecs")}
                  </span>
                </span>
                <Download
                  size={20}
                  className="ms-2 text-dark-400 transition-transform group-hover:translate-y-0.5"
                />
              </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 产品详情内容 */}
      {detailContent && (
        <section className="border-y border-gray-200 bg-dark-50 py-14 lg:py-20">
          <div className="container">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-dark">
              <span className="h-7 w-1 bg-accent" />
              {t("productDetails")}
            </h2>
            <div className="border border-gray-200 bg-white p-8 shadow-sm lg:p-10">
              <div
                className="prose max-w-none leading-relaxed text-dark-600"
                dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(detailContent) }}
              />
            </div>
          </div>
        </section>
      )}

      {/* 相关产品 */}
      {relatedModels.length > 0 && (
        <section className="bg-white py-14 lg:py-20">
          <div className="container">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-dark">
              <span className="h-7 w-1 bg-accent" />
              {t("relatedProducts")}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedModels.map((related: any) => (
                <UnilokProductCard
                  key={related.id}
                  product={related}
                  tabId={tab.id}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white lg:text-3xl">
            {t("needCustomSolution")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-white/80">
            {t("customSolutionDesc")}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white px-8 py-3.5 font-medium text-primary transition-colors hover:bg-dark-50"
          >
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>

      {/* 返回列表 */}
      <div className="bg-white py-8">
        <div className="container">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-500 transition-colors hover:text-accent"
          >
            <ChevronLeft size={16} className="rtl-flip" />
            {t("unilokBackToProducts")}
          </Link>
        </div>
      </div>
    </div>
  );
}
