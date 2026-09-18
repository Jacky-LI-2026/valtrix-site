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
import { useProductTabs, useProductBySlug } from "@/lib/api/useProducts";
import UnilokPageHero from "./PageHero";
import UnilokProductCard from "./ProductCard";

const DEFAULT_MANUAL_URL = "/downloads/valtrix-product-catalog-2026.pdf";

/**
 * UNILOK 精密工业风 · 产品详情页
 * PageHero（产品名+型号）+ 产品图/参数表布局 + 特点列表 + 相关产品
 */
export default function UnilokProductDetailPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const modelId = params?.id as string;

  const { productTabs } = useProductTabs();
  const { product: detailProduct } = useProductBySlug(modelId);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setImgIdx(0);
  }, [modelId]);

  // 查找当前产品所属 tab / category
  let info: { model: any; category: any; tab: any } | null = null;
  for (const tab of productTabs) {
    for (const cat of tab.categories) {
      const m = cat.models.find((mm: any) => mm.id === modelId);
      if (m) {
        info = { model: m, category: cat, tab };
        break;
      }
    }
    if (info) break;
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
  const features = loc.getArray(model, "features");
  const detailContent = loc.get(model, "detailContent");
  const relatedModels = category.models
    .filter((m: any) => m.id !== model.id)
    .slice(0, 3);
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
                  <div className="overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <tbody>
                        {specs.map((spec: any, index: number) => (
                          <tr
                            key={spec.label || index}
                            className={index % 2 === 0 ? "bg-white" : "bg-dark-50"}
                          >
                            <td className="w-2/5 border-b border-gray-100 px-5 py-3 text-sm text-dark-500">
                              {loc.get(spec, "label")}
                            </td>
                            <td className="border-b border-gray-100 px-5 py-3 text-sm font-medium text-dark-800">
                              {loc.get(spec, "value")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 手册下载 */}
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
                dangerouslySetInnerHTML={{ __html: detailContent }}
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
