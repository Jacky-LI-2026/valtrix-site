"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
import { ShoppingBag, ImageOff, TicketPercent } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePricingContext } from "@/components/PriceDisplay";

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  nameKo: string | null;
  nameFr: string | null;
  nameAr: string | null;
  summary: string | null;
  summaryEn: string | null;
  coverImage: string | null;
  price: number | null;
  originalPrice: number | null;
  isParts: boolean;
  unit: string | null;
  stock: number;
  minOrder: number;
  featured: boolean;
  priceTiers?: any;
}

export default function ShopPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const pricing = usePricingContext(locale);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState("");

  useEffect(() => {
    fetch("/api/public/shop/categories")
      .then((r) => r.json())
      .then((d) => setCats(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = activeCat
      ? `/api/public/shop/products?limit=60&category=${encodeURIComponent(activeCat)}`
      : "/api/public/shop/products?limit=60";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setItems(d.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCat]);

  function addToCart(item: ShopItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("shop_cart");
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((x: any) => x.slug === item.slug);
      if (idx >= 0) arr[idx].qty = (Number(arr[idx].qty) || 1) + 1;
        else
        arr.push({
          slug: item.slug,
          name: item.name,
          nameEn: item.nameEn,
          price: item.price,
          priceTiers: (item as any).priceTiers || null,
          unit: item.unit,
          cover: item.coverImage,
          qty: 1,
        });
      localStorage.setItem("shop_cart", JSON.stringify(arr));
      window.dispatchEvent(new Event("shop-cart-updated"));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <PageHero title={t("shopTitle")} titleEn="Online Shop" subtitle={t("shopSubtitle")} subtitleEn="Featured products, order online, bank/offline payment supported" breadcrumb={t("shopTitle")} breadcrumbEn="Online Shop" />
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* 分类筛选 + 领券中心入口 */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCat("")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCat === "" ? "text-white" : "border border-dark-200 bg-white text-dark-600 hover:bg-dark-50"
            }`}
            style={activeCat === "" ? { background: "var(--color-primary, #CC0000)" } : {}}
          >
            {t("shopAll") || "全部"}
          </button>
          {cats.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCat(c.slug)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCat === c.slug ? "text-white" : "border border-dark-200 bg-white text-dark-600 hover:bg-dark-50"
              }`}
              style={activeCat === c.slug ? { background: "var(--color-primary, #CC0000)" } : {}}
            >
              {loc.get(c, "name")}
            </button>
          ))}
          <Link
            href="/shop/coupons"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-dashed px-4 py-2 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--color-primary, #CC0000)", color: "var(--color-primary, #CC0000)" }}
          >
            <TicketPercent className="h-4 w-4" />
            {t("couponCenter") || "领券中心"}
          </Link>
        </div>
        {loading ? (
          <div className="py-20 text-center text-dark-400">{t("loading") || "加载中..."}</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-dark-400">{t("emptyCart")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/shop/${item.slug}`}
                className="group overflow-hidden rounded-2xl border border-dark-100 bg-white transition-shadow hover:shadow-lg"
              >
                {/* 商城商品卡：1:1 + 铺满（与产品页统一） */}
                <div className="relative aspect-square overflow-hidden bg-dark-50">
                  {item.coverImage ? (
                    <Image
                      src={item.coverImage}
                      alt={loc.get(item, "name")}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-10 w-10 text-dark-300" />
                    </div>
                  )}
                  {item.featured && (
                    <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ background: "var(--color-primary, #CC0000)" }}>
                      HOT
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="truncate text-base font-semibold text-dark-800">{loc.get(item, "name")}</h3>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-dark-500">{loc.get(item, "summary")}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {(() => {
                        const partsGated = Boolean(item.isParts) && !pricing.memberCanSeeParts;
                        const showPrice = pricing.mode === "public" || (pricing.mode === "byCustomerType" && pricing.memberCustomerType && !partsGated);
                        return showPrice && item.price ? (
                          <span className="text-lg font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>
                            ¥{item.price.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-dark-500">
                            {pricing.mode === "public" ? t("priceNegotiable") : t("priceOnRequest") || "面议"}
                          </span>
                        );
                      })()}
                      {item.originalPrice ? (
                        <span className="ml-2 text-sm text-dark-300 line-through">¥{item.originalPrice.toLocaleString()}</span>
                      ) : null}
                      {item.unit ? <span className="ml-1 text-xs text-dark-400">/{item.unit}</span> : null}
                    </div>
                    <button
                      onClick={(e) => addToCart(item, e)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ background: "var(--color-primary, #CC0000)" }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("shopAddToCart")}</span>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
