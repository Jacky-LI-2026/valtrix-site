"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
import { Minus, Plus, Trash2, ImageOff, TicketPercent } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { displayUnitPrice } from "@/lib/shop-price";

interface CartItem {
  slug: string;
  name: string;
  nameEn: string | null;
  price: number | null;
  priceTiers?: any;
  specText?: string;
  specMode?: boolean;
  unit: string | null;
  cover: string | null;
  qty: number;
}

interface AvailCoupon {
  code: string;
  name: string;
  type: string;
  amount: number;
  minAmount: number;
  discount: number;
  claimId: string;
}

export default function ShopCartPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<AvailCoupon[]>([]);
  const [selCoupon, setSelCoupon] = useState<AvailCoupon | null>(null);
  const [couponTip, setCouponTip] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    readCart();
    window.addEventListener("shop-cart-updated", readCart);
    return () => window.removeEventListener("shop-cart-updated", readCart);
  }, []);

  function readCart() {
    try {
      const raw = localStorage.getItem("shop_cart");
      const arr = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch {
      setItems([]);
    }
  }

  function save(next: CartItem[]) {
    localStorage.setItem("shop_cart", JSON.stringify(next));
    window.dispatchEvent(new Event("shop-cart-updated"));
    setItems(next);
  }

  function changeQty(idx: number, delta: number) {
    const next = items.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, Math.min(9999, it.qty + delta)) } : it));
    save(next);
  }

  function remove(idx: number) {
    save(items.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, it) => s + (displayUnitPrice(it, it.qty).price || 0) * it.qty, 0);
  const totalCount = items.reduce((s, it) => s + it.qty, 0);
  const discount = selCoupon ? selCoupon.discount : 0;
  const payable = Math.max(0, total - discount);

  // 拉取当前可用券
  useEffect(() => {
    if (total <= 0) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/shop/coupons/available?total=${total}`);
        const d = await r.json();
        if (!alive) return;
        setCoupons(d.coupons || []);
        // 恢复上次选择的券（若仍可用）
        try {
          const saved = JSON.parse(localStorage.getItem("shop_coupon") || "null");
          if (saved?.code) {
            const hit = (d.coupons || []).find((c: any) => c.code === saved.code);
            setSelCoupon(hit || null);
          } else {
            setSelCoupon(null);
          }
        } catch {
          setSelCoupon(null);
        }
      } catch {
        /* 忽略 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [total]);

  function chooseCoupon(c: AvailCoupon | null) {
    setSelCoupon(c);
    setCouponTip(c ? "" : "已不使用优惠券");
    if (c) localStorage.setItem("shop_coupon", JSON.stringify({ code: c.code, claimId: c.claimId, name: c.name, discount: c.discount }));
    else localStorage.removeItem("shop_coupon");
  }

  async function applyCode() {
    const code = codeInput.trim();
    if (!code) return;
    setCodeBusy(true);
    setCouponTip("");
    try {
      const r = await fetch("/api/public/shop/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, total }),
      });
      const d = await r.json();
      if (d.ok) {
        const c: AvailCoupon = { code: d.coupon.code, name: d.coupon.name || d.coupon.code, type: d.coupon.type, amount: d.coupon.amount, minAmount: d.coupon.minAmount, discount: d.coupon.discount, claimId: "" };
        setSelCoupon(c);
        setCodeInput("");
        localStorage.setItem("shop_coupon", JSON.stringify({ code: c.code, claimId: "", name: c.name, discount: c.discount }));
        setCouponTip("券码已生效");
      } else {
        setCouponTip(d.error || "券码无效");
      }
    } catch {
      setCouponTip("网络错误，请重试");
    } finally {
      setCodeBusy(false);
    }
  }

  return (    <>
      <PageTitle title={t("shopCartTitle") || "购物车"} fallback="VALTRIX VALTRIX" />

    <>
      <PageHero title={t("cartTitle")} titleEn="Shopping Cart" subtitle={t("shopSubtitle")} subtitleEn="Featured products, order online" breadcrumb={t("cartTitle")} breadcrumbEn="Shopping Cart" />
      <div className="mx-auto max-w-5xl px-4 py-12">
        {items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-dark-400">{t("emptyCart")}</p>
            <Link href="/shop" className="mt-6 inline-block rounded-lg px-6 py-3 font-medium text-white"
              style={{ background: "var(--color-primary, #CC0000)" }}>
              {t("continueShopping")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.slug + (it.specText || "")} className="flex items-center gap-4 rounded-2xl border border-dark-100 bg-white p-4">
                <Link href={`/shop/${it.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-dark-50">
                  {it.cover ? (
                    <Image src={it.cover} alt={it.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-6 w-6 text-dark-300" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/shop/${it.slug}`} className="block truncate font-medium text-dark-800">
                    {locale === "zh" ? it.name : it.nameEn || it.name}
                  </Link>
                  {it.specText ? <div className="mt-0.5 text-xs text-dark-400">{it.specText}</div> : null}
                  <div className="mt-1 text-sm">
                    {(() => {
                      const dp = displayUnitPrice(it, it.qty);
                      if (dp.price !== null) {
                        return (
                          <span className="font-semibold" style={{ color: "var(--color-primary, #CC0000)" }}>
                            ¥{(dp.price * it.qty).toLocaleString()}
                            {dp.tiered ? <span className="ml-1 text-xs font-normal text-dark-400">（¥{dp.price.toLocaleString()}/件）</span> : null}
                          </span>
                        );
                      }
                      return <span className="text-dark-400">{t("priceNegotiable")}</span>;
                    })()}
                    {it.unit ? <span className="ml-1 text-xs text-dark-400">/{it.unit}</span> : null}
                  </div>
                </div>
                <div className="flex items-center rounded-lg border border-dark-200">
                  <button className="p-2" onClick={() => changeQty(idx, -1)}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{it.qty}</span>
                  <button className="p-2" onClick={() => changeQty(idx, 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button className="p-2 text-dark-300 hover:text-red-500" onClick={() => remove(idx)}>
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <div className="rounded-2xl border border-dark-100 bg-white p-6">
              {/* 优惠券区 */}
              <div className="mb-4 border-b border-dark-100 pb-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-dark-700">
                  <TicketPercent className="h-4 w-4" style={{ color: "var(--color-primary, #CC0000)" }} />
                  优惠券
                  {selCoupon && (
                    <button onClick={() => chooseCoupon(null)} className="ml-auto text-xs text-dark-400 hover:text-red-500">
                      不使用
                    </button>
                  )}
                </div>
                {/* B2B 定向发券：输入券码即用 */}
                <div className="mt-2 flex gap-2">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                    placeholder="输入销售提供的优惠券码"
                    disabled={!!selCoupon}
                    className="min-w-0 flex-1 rounded-lg border border-dark-200 px-3 py-2 text-sm outline-none focus:border-dark-400 disabled:bg-dark-50"
                  />
                  <button
                    onClick={applyCode}
                    disabled={codeBusy || !!selCoupon || !codeInput.trim()}
                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: "var(--color-primary, #CC0000)" }}
                  >
                    {codeBusy ? "校验中..." : "应用"}
                  </button>
                </div>
                {!selCoupon && coupons.length > 0 && (
                  <>
                    <p className="mt-3 text-xs text-dark-400">或选择已领取的优惠券：</p>
                    <div className="mt-1 flex flex-col gap-2">
                      {coupons.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => chooseCoupon(c)}
                          className="flex items-center justify-between rounded-xl border border-dark-200 bg-white px-3 py-2 text-left text-sm text-dark-700 transition hover:border-dark-300"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="shrink-0 font-semibold">-¥{c.discount.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {selCoupon && (
                  <p className="mt-2 text-sm font-medium" style={{ color: "var(--color-primary, #CC0000)" }}>
                    {selCoupon.name}：-¥{selCoupon.discount.toLocaleString()}
                  </p>
                )}
                {couponTip && <p className="mt-2 text-xs text-dark-400">{couponTip}</p>}
              </div>

              <div className="flex items-center justify-between text-lg">
                <span className="text-dark-600">{t("shopTotal")}（{totalCount}）</span>
                <span className="text-2xl font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>
                  ¥{total.toLocaleString()}
                </span>
              </div>
              {discount > 0 && (
                <>
                  <div className="mt-1 flex items-center justify-between text-sm text-dark-400">
                    <span>优惠</span>
                    <span>-¥{discount.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-base font-semibold">
                    <span className="text-dark-800">实付</span>
                    <span className="text-lg font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>¥{payable.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Link href="/shop" className="rounded-lg border border-dark-200 px-6 py-3 font-medium text-dark-600 hover:bg-dark-50">
                  {t("continueShopping")}
                </Link>
                <Link href="/shop/checkout" className="rounded-lg px-8 py-3 font-medium text-white"
                  style={{ background: "var(--color-primary, #CC0000)" }}>
                  {t("checkout")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
    </>
  );
}
