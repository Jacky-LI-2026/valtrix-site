"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Download, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { groupSpecs } from "@/lib/spec-grouping";
import { getBrandNameEn } from "@/lib/brand";
import { useProductBySlug } from "@/lib/api/useProducts";
import KitzPageHero from "./PageHero";
import KitzProductCard from "./ProductCard";
import KitzCornerAccent from "./CornerAccent";

/**
 * 产品手册兜底路径走部署级 env —— 站点差异不得写死在代码里（AGENTS.md G2）。
 * ⚠️ 之前此处曾写死某个站的 PDF 文件名，会把 A 站的手册印到 B 站页面上。
 *     部署侧通过 NEXT_PUBLIC_PRODUCT_MANUAL_URL 注入自己站点的手册地址。
 *     空串 ⇒ 整个下载块不渲染（避免 href="" 的坏链）。
 */
const DEFAULT_MANUAL_URL = process.env.NEXT_PUBLIC_PRODUCT_MANUAL_URL || "";

// 规格表用「细线 + 交替底色」表达，KITZ 风：无圆角、无阴影
const SPEC_ROW_BASE = "border-b border-gray-100";

/**
 * KITZ SCT 日式工业风 · 产品详情页
 *
 * 数据获取与 UNILOK 对应件完全一致：**只调 useProductBySlug**（单产品接口），
 * 该接口自带 tab / category / specs / features / detailContent / related。
 * 仅渲染层改为 KITZ 的排版语言：方形图、细线参数表、大量留白。
 */
export default function KitzProductDetailPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const modelId = params?.id as string;

  // ⚠️ 2026-09-15 性能修复：**不再用「全量产品列表」当渲染门闩**。
  //   `useProductTabs()` 打的是 `/api/public/products`（全站产品树）。实测两站差异极大：
  //     左文站 0.34s / 0.24MB ｜ **阀门站 12s+ / 3.55MB**（44 型号 × 6 语种 × 单型号 184 行规格）
  //   而 `useProductBySlug()` 打的 `/api/public/products/<型号>` 只要 **0.27s / 0.23MB**，
  //   且**响应里已带 `tab` 与 `category`** ⇒ 详情页本来就不需要等列表。
  //   改前线上实测：阀门站详情页转圈 90 秒仍未渲染（用户报的「产品中心不显示」）。
  // ⚠️ 2026-09-18：**不再拉全量产品树**。
  //   本页只需要「当前型号」+「同分类的相关产品」，而后者的 6 条已随详情接口一起返回
  //   （`/api/public/products/<slug>` 的 `related`）。原先为了相关产品要额外拉一棵
  //   含**全部型号六语种正文**（约 64% 体积）的产品树 ⇒ 详情页是当时最重的页面。
  //   现在详情页只发**一个**请求。
  const { product: detailProduct, loading: detailLoading } = useProductBySlug(modelId);
  const [imgIdx, setImgIdx] = useState(0);

  // 切换产品时重置图集索引，否则会残留上一个产品的第 N 张图
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

  // 同步浏览器标签页标题（必须声明在所有提前 return 之前，遵守 Hooks 顺序规则）
  useEffect(() => {
    if (!info) return;
    const name = loc.get(info.model, "name");
    document.title = `${name} - ${getBrandNameEn()}`;
  }, [info, loc]);

  // 详情接口还没回来 → 加载态；回来后仍无数据（404）→ 走下面的「产品不存在」
  if (!info && detailLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin border border-gray-200 border-t-primary" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="mb-5 text-2xl font-bold tracking-tight text-dark">
            {t("productNotFound")}
          </h1>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 border border-gray-200 px-6 py-3 text-sm font-medium text-dark-600 transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronLeft size={16} className="rtl-flip" />
            {t("backToProducts")}
          </Link>
        </div>
      </div>
    );
  }

  const { model, category, tab } = info;

  // 图集：主图 + images（可能是字符串，也可能是 {url} 对象，统一归一化）
  const images = [model.image, ...(Array.isArray(model.images) ? model.images : [])]
    .map((x: any) => (typeof x === "string" ? x : x?.url || ""))
    .filter(Boolean);
  const currentImage = images[imgIdx] || images[0] || "";

  // 详情接口返回的 specs 比列表更全，优先用；否则回落到列表里的 specs
  const specs =
    detailProduct?.specs && detailProduct.specs.length > 0
      ? detailProduct.specs
      : model.specs || [];
  // 同 label 多尺寸值的行合并 label 单元格（rowSpan），交由公共工具处理
  const groupedSpecs = groupSpecs(specs, loc);
  const features = loc.getArray(model, "features");
  const detailContent = loc.get(model, "detailContent");
  // 相关产品：来自详情接口的 `related`（同分类其它已发布型号，服务端已按站点过滤并排好序）。
  // 拿不到就是空数组 —— 下方 `relatedModels.length > 0` 守卫会让该区块自然隐藏。
  const relatedModels = (Array.isArray(dp?.related) ? dp.related : []).slice(0, 3);
  const manualUrl = model?.manualUrl || DEFAULT_MANUAL_URL;

  return (
    <div className="bg-white">
      <KitzPageHero
        eyebrow={loc.get(tab, "name")}
        title={loc.get(model, "name")}
        subtitle={`${t("kitzModelLabel")} · ${model.model}`}
        breadcrumb={[
          { label: t("home"), href: "/" },
          { label: t("products"), href: "/products" },
          { label: loc.get(category, "name"), href: `/products?tab=${tab.id}` },
          { label: model.model },
        ]}
      />

      {/* 主区：方形图 + 信息/参数表 */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-2">
            {/* 图片区：KITZ 用方形（1:1），不用 4:3 宽幅 */}
            <div className="lg:sticky lg:top-24">
              <div className="relative aspect-square overflow-hidden border border-gray-200 bg-dark-50">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={`${loc.get(model, "name")} - ${model.model}`}
                    className="h-full w-full object-contain p-10"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-4xl font-bold text-dark-200">
                      {String(model.model || "-").charAt(0)}
                    </span>
                  </div>
                )}
                <KitzCornerAccent />
              </div>

              {/* 缩略图：一律正方形，选中项用主色底线标识 */}
              {images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {images.map((img: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setImgIdx(index)}
                      className={`aspect-square w-20 shrink-0 overflow-hidden border transition-colors ${
                        index === imgIdx
                          ? "border-primary"
                          : "border-gray-200 hover:border-dark-300"
                      }`}
                      aria-label={`${t("view")} ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${model.model} ${index + 1}`}
                        className="h-full w-full bg-dark-50 object-contain p-1"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 信息区 */}
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="border border-primary/30 px-3 py-1 text-xs font-medium tracking-wide text-primary">
                  {loc.get(category, "name")}
                </span>
                <span className="bg-dark-50 px-3 py-1 text-xs font-medium tracking-wide text-dark-500">
                  {loc.get(tab, "name")}
                </span>
              </div>

              <h2 className="mb-3 text-3xl font-bold tracking-tight text-dark lg:text-4xl">
                {loc.get(model, "name")}
              </h2>
              <p className="mb-6 text-lg font-semibold tabular-nums tracking-widest text-dark-400">
                {model.model}
              </p>
              <p className="mb-10 text-base leading-relaxed text-dark-600">
                {loc.get(model, "description")}
              </p>

              {/* 核心特性：方框 + 对勾，两列 */}
              {features.length > 0 && (
                <div className="mb-10">
                  <h3 className="mb-4 border-b border-dark pb-3 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                    {t("keyFeatures")}
                  </h3>
                  <div className="grid grid-cols-1 gap-px border border-gray-200 bg-gray-200 sm:grid-cols-2">
                    {features.map((feature: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-white p-4"
                      >
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span className="text-sm leading-relaxed text-dark-600">
                          {String(feature)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 参数表：KITZ 的图纸式排版 —— 左栏标签 40%，细线分行 */}
              {specs.length > 0 && (
                <div className="mb-10">
                  <h3 className="mb-4 border-b border-dark pb-3 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
                    {t("technicalSpecs")}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse">
                      <tbody>
                        {groupedSpecs.map((group, gi) =>
                          group.values.map((value, vi) => (
                            <tr
                              key={`${group.key}-${vi}`}
                              className={
                                gi % 2 === 0 ? "bg-white" : "bg-dark-50"
                              }
                            >
                              {vi === 0 && (
                                <td
                                  rowSpan={group.values.length}
                                  className={`${SPEC_ROW_BASE} w-2/5 px-5 py-3.5 align-top text-sm tracking-wide text-dark-500`}
                                >
                                  {group.label}
                                </td>
                              )}
                              <td
                                className={`${SPEC_ROW_BASE} px-5 py-3.5 text-sm font-medium text-dark-800`}
                              >
                                {value}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 手册下载：无有效 URL 时整块隐藏（见文件顶部 DEFAULT_MANUAL_URL 说明） */}
              {manualUrl && (
                <a
                  href={manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center gap-4 border border-gray-200 px-6 py-4 transition-colors hover:border-primary sm:w-auto"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-dark-50">
                    <FileText size={18} className="text-primary" />
                  </span>
                  <span className="flex-1 text-start">
                    <span className="block text-sm font-semibold text-dark">
                      {t("downloadProductManual")}
                    </span>
                    <span className="block text-xs text-dark-400">
                      {t("pdfFormatSpecs")}
                    </span>
                  </span>
                  <Download
                    size={18}
                    className="ms-2 shrink-0 text-dark-400 transition-transform group-hover:translate-y-0.5"
                  />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 产品详情正文 */}
      {detailContent && (
        <section className="border-y border-gray-200 bg-white py-16 lg:py-24">
          <div className="container">
            <h2 className="mb-8 border-b border-dark pb-4 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
              {t("productDetails")}
            </h2>
            <div className="mx-auto max-w-3xl">
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
        <section className="bg-dark-50 py-16 lg:py-24">
          <div className="container">
            <h2 className="mb-10 border-b border-dark pb-4 text-sm font-semibold uppercase tracking-[0.2em] text-dark">
              {t("relatedProducts")}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedModels.map((related: any) => (
                <KitzProductCard
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
      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          <div className="border border-gray-200 p-10 text-center lg:p-14">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-dark lg:text-3xl">
              {t("needCustomSolution")}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-dark-500">
              {t("customSolutionDesc")}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
            >
              {t("contactUs")}
              <ArrowRight size={16} className="rtl-flip" />
            </Link>
          </div>
        </div>
      </section>

      {/* 返回列表 */}
      <div className="border-t border-gray-200 bg-white py-8">
        <div className="container">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-400 transition-colors hover:text-primary"
          >
            <ChevronLeft size={16} className="rtl-flip" />
            {t("kitzBackToProducts")}
          </Link>
        </div>
      </div>
    </div>
  );
}
