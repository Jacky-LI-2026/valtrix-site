"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import { ShoppingBag, ImageOff, Minus, Plus, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { preserveLeadingSpaces } from "@/lib/rich-text";
import { displayUnitPrice } from "@/lib/shop-price";
import PriceDisplay, { usePricingContext } from "@/components/PriceDisplay";

export default function ShopDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const pricing = usePricingContext(locale);
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    fetch(`/api/public/shop/products/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setProduct(d.product);
          setQty(Math.max(1, d.product.minOrder || 1));
          setActiveImg(0);
          setSel({});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  // ---- 规格组合定价：组合单价 = 基础售价 + Σ各维度选中选项价格 ----
  const specs: any[] = Array.isArray(product?.specs) ? product.specs : [];
  const hasSpecs = specs.length > 0;
  const comboPrice = (() => {
    if (!product) return null;
    const base = product.price === null || product.price === undefined || product.price === "" ? 0 : Number(product.price);
    let sum = base;
    specs.forEach((d, di) => {
      const oi = sel[di] ?? 0;
      const o = d?.options?.[oi];
      const p = o && o.price !== "" && o.price != null ? Number(o.price) : 0;
      sum += p || 0;
    });
    return sum;
  })();
  const comboText = hasSpecs
    ? specs.map((d, di) => {
        const o = d?.options?.[sel[di] ?? 0];
        return (d?.name || "") + ":" + (o?.label || "");
      }).join(" / ")
    : "";

  function addToCart(goCart = false) {
    if (!product) return;
    try {
      const raw = localStorage.getItem("shop_cart");
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((x: any) => x.slug === product.slug && x.specText === comboText);
      const item = {
        slug: product.slug,
        name: product.name,
        nameEn: product.nameEn,
        price: hasSpecs ? comboPrice : product.price,
        priceTiers: product.priceTiers || null,
        specMode: hasSpecs,
        specText: comboText,
        specs: specs,
        // sel 需序列化为数组（React state 是 {0:2,1:1} 对象，服务端 Array.isArray 校验会失败）
        sel: Object.keys(sel).length ? Object.keys(sel).sort((a: any, b: any) => Number(a) - Number(b)).map((k: any) => sel[Number(k)]) : [],
        unit: product.unit,
        cover: product.coverImage,
        qty,
      };
      if (idx >= 0) arr[idx] = item;
      else arr.push(item);
      localStorage.setItem("shop_cart", JSON.stringify(arr));
      window.dispatchEvent(new Event("shop-cart-updated"));
      if (goCart) router.push("/shop/cart");
    } catch {
      /* ignore */
    }
  }

  if (loading) return <div className="py-24 text-center text-dark-400">{t("loading") || "加载中..."}</div>;
  if (!product) return <div className="py-24 text-center text-dark-400">{t("notFound") || "未找到商品"}</div>;

  const stockOk = product.stock === -1 || product.stock > 0;

  // 画廊图片列表：多图优先，回退封面图
  const galleryImgs: string[] = Array.isArray(product.images)
    ? product.images.map((x: any) => (typeof x === "string" ? x : x?.url || "")).filter(Boolean)
    : [];
  if (product.coverImage && !galleryImgs.includes(product.coverImage)) galleryImgs.unshift(product.coverImage);
  if (galleryImgs.length === 0) galleryImgs.push("");
  const curImg = galleryImgs[activeImg] || galleryImgs[0];

  return (
    <>
      <PageHero title={loc.get(product, "name")} titleEn={product.nameEn || "Product"} subtitle={loc.get(product, "summary")} subtitleEn={product.summaryEn || ""} breadcrumb={t("shopTitle")} breadcrumbEn="Online Shop" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* 图片画廊 */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white">
              <div className="relative aspect-square bg-dark-50">
                {curImg ? (
                  <Image src={curImg} alt={loc.get(product, "name")} fill className="object-contain p-4" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-16 w-16 text-dark-300" />
                  </div>
                )}
              </div>
            </div>
            {galleryImgs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {galleryImgs.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative h-16 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === activeImg ? "border-primary" : "border-transparent hover:border-dark-200"
                    }`}
                  >
                    {u ? (
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-dark-50 text-xs text-dark-300">-</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 信息 */}
          <div>
            <h1 className="text-2xl font-bold text-dark-800">{loc.get(product, "name")}</h1>
            {product.summary && <p className="mt-3 text-dark-500">{loc.get(product, "summary")}</p>}
            {pricing.mode === "public" ? (
              <div className="mt-6 flex items-end gap-3">
                {(() => {
                  const dp = displayUnitPrice({ ...product, price: comboPrice, specMode: hasSpecs }, qty);
                  if (dp.price !== null) {
                    return (
                      <>
                        <span className="text-3xl font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>
                          ¥{dp.price.toLocaleString()}
                        </span>
                        {product.originalPrice ? (
                          <span className="mb-1 text-lg text-dark-300 line-through">¥{Number(product.originalPrice).toLocaleString()}</span>
                        ) : null}
                        {product.unit ? <span className="mb-1 text-dark-400">/{product.unit}</span> : null}
                      </>
                    );
                  }
                  return <span className="text-2xl font-semibold text-dark-500">{t("priceNegotiable")}</span>;
                })()}
              </div>
            ) : (
              <div className="mt-6">
                <PriceDisplay
                  mode={pricing.mode}
                  isParts={Boolean(product.isParts)}
                  price={comboPrice != null ? Number(comboPrice) : null}
                  priceTiers={product.priceTiers || null}
                  productId={product.slug}
                  productName={loc.get(product, "name")}
                  memberCustomerType={pricing.memberCustomerType}
                  memberCanSeeParts={pricing.memberCanSeeParts}
                  locale={locale}
                  showInquiry={false}
                />
              </div>
            )}
            {/* 规格组合选择（组合单价 = 基础价 + Σ选项价格） */}
            {hasSpecs && (
              <div className="mt-5 space-y-4 rounded-xl border border-dark-100 bg-dark-50/40 p-4">
                {specs.map((d, di) => (
                  <div key={di}>
                    <div className="mb-1.5 text-xs font-medium text-dark-600">
                      {d.nameEn ? d.name + " / " + d.nameEn : d.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(d.options) && d.options.map((o: any, oi: number) => {
                        const active = (sel[di] ?? 0) === oi;
                        const op = o && o.price !== "" && o.price != null ? Number(o.price) : 0;
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => setSel((s) => ({ ...s, [di]: oi }))}
                            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                              active
                                ? "border-primary bg-primary/5 font-semibold"
                                : "border-dark-200 bg-white text-dark-600 hover:border-primary/60"
                            }`}
                            style={active ? { color: "var(--color-primary, #CC0000)" } : {}}
                          >
                            {o.label}
                            {o.labelEn && o.labelEn !== o.label ? " / " + o.labelEn : ""}
                            {op > 0 ? " +¥" + op.toLocaleString() : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {comboPrice != null && (
                  <div className="border-t border-dark-100 pt-2 text-sm text-dark-500">
                    {t("selectedModel") || "当前组合"}: <span className="font-medium text-dark-700">{comboText || "—"}</span>
                    {product.price != null && Number(product.price) > 0 && comboPrice !== Number(product.price) && (
                      <span className="ml-2 text-xs text-dark-400">基础 ¥{Number(product.price).toLocaleString()} + 规格差价</span>
                    )}
                  </div>
                )}
              </div>
            )}
            {Array.isArray(product.priceTiers) && product.priceTiers.length > 0 && (
              <div className="mt-3 rounded-lg border border-dark-100 bg-dark-50/50 p-3">
                <div className="mb-1.5 text-xs font-medium text-dark-500">{t("shopBulkPrice") || "批量价"}</div>
                <div className="flex flex-wrap gap-2">
                  {[...product.priceTiers]
                    .filter((t: any) => t && Number(t.qty) > 0 && t.price !== "" && t.price != null)
                    .sort((a: any, b: any) => Number(a.qty) - Number(b.qty))
                    .map((t: any, i: number) => {
                      const hit = qty >= Number(t.qty);
                      const isDiscount = hasSpecs;
                      const effective = isDiscount && comboPrice != null
                        ? parseFloat((Number(comboPrice) * Number(t.price) / 100).toFixed(2))
                        : Number(t.price);
                      return (
                        <span
                          key={i}
                          className={`rounded-full px-2.5 py-1 text-xs ${hit ? "bg-primary/10 font-semibold" : "bg-dark-100 text-dark-500"}`}
                          style={hit ? { color: "var(--color-primary, #CC0000)" } : {}}
                        >
                          {Number(t.qty)}+ 件{isDiscount ? ` ${Number(t.price)}折 ¥${effective.toLocaleString()}` : ` ¥${effective.toLocaleString()}`}
                          {hit ? " ✓" : ""}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
            <div className="mt-2 text-sm text-dark-500">
              {stockOk ? t("stockUnlimited") : t("stockOut")} · 起订量 {product.minOrder || 1}
            </div>
            {/* 数量 */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm text-dark-600">{t("qty")}</span>
              <div className="flex items-center rounded-lg border border-dark-200">
                <button className="p-2" onClick={() => setQty((q) => Math.max(product.minOrder || 1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-sm font-medium">{qty}</span>
                <button className="p-2" onClick={() => setQty((q) => Math.min(9999, q + 1))}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* 操作 */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => addToCart(false)}
                className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-primary, #CC0000)" }}
              >
                <ShoppingBag className="h-5 w-5" />
                {t("shopAddToCart")}
              </button>
              <button
                onClick={() => addToCart(true)}
                className="rounded-lg border-2 px-6 py-3 font-medium transition-colors hover:bg-dark-50"
                style={{ borderColor: "var(--color-primary, #CC0000)", color: "var(--color-primary, #CC0000)" }}
              >
                {t("buyNow")}
              </button>
              <Link href="/shop" className="rounded-lg border border-dark-200 px-6 py-3 font-medium text-dark-600 hover:bg-dark-50">
                {t("continueShopping")}
              </Link>
            </div>
            {/* 详情 */}
            {product.description && (
              <div className="prose mt-8 max-w-none border-t border-dark-100 pt-6 text-dark-600"
                dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(loc.get(product, "description")) }} />
            )}
            {/* 模型及图纸下载 */}
            {Array.isArray(product.modelFiles) && product.modelFiles.length > 0 && (
              <div className="mt-6 border-t border-dark-100 pt-6">
                <h3 className="mb-3 text-base font-semibold text-dark-800">模型及图纸下载</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {product.modelFiles.filter((f: any) => f && f.url).map((f: any, fi: number) => (
                    <a key={fi} href={f.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-dark-100 p-3 text-sm text-dark-700 transition-colors hover:border-primary hover:text-primary">
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{f.name || "下载文件"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
