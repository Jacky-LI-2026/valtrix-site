"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState, useEffect } from "react";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  specs?: any;
  sel?: any;
  unit: string | null;
  cover: string | null;
  qty: number;
}

export default function ShopCheckoutPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    remark: "",
    poNo: "",
    payMethod: "contact",
    invoiceTitle: "",
    taxNo: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shop_cart");
      const arr = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch {
      setItems([]);
    }
  }, []);

  // 已登录会员自动带出资料
  useEffect(() => {
    fetch("/api/public/member", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.ok && d.member) {
          const m = d.member;
          setForm((f) => ({
            ...f,
            name: f.name || m.name || "",
            phone: f.phone || m.phone || "",
            email: f.email || m.email || "",
            company: f.company || m.company || "",
            invoiceTitle: f.invoiceTitle || m.invoiceTitle || "",
            taxNo: f.taxNo || m.taxNo || "",
          }));
          if (m.address && (m.address.province || m.address.city || m.address.detail)) {
            setForm((f) => ({
              ...f,
              address: f.address || [m.address.province, m.address.city, m.address.district, m.address.detail].filter(Boolean).join(" "),
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const total = items.reduce((s, it) => s + (displayUnitPrice(it, it.qty).price || 0) * it.qty, 0);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setError("");
    if (!form.name.trim()) return setError(t("orderName") + " *");
    if (!form.phone.trim()) return setError(t("orderPhone") + " *");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError(t("orderEmail") + " *");
    setSubmitting(true);
    try {
      // 读取购物车选择的优惠券
      let couponCode = "";
      try {
        const saved = JSON.parse(localStorage.getItem("shop_coupon") || "null");
        if (saved?.code) couponCode = saved.code;
      } catch {
        /* 忽略 */
      }
      const r = await fetch("/api/public/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          couponCode: couponCode || undefined,
          items: items.map((it) => ({
            slug: it.slug,
            name: it.name,
            nameEn: it.nameEn,
            price: it.price,
            unit: it.unit,
            cover: it.cover,
            qty: it.qty,
            specText: it.specText || "",
            specMode: Boolean(it.specMode),
            specs: it.specs || null,
            sel: it.sel || null,
          })),
        }),
      });
      const d = await r.json();
      if (d.ok) {
        localStorage.removeItem("shop_cart");
        localStorage.removeItem("shop_coupon");
        window.dispatchEvent(new Event("shop-cart-updated"));
        setResult(d);
      } else {
        setError(d.error || "提交失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  const PAY_KEY: Record<string, any> = {
    contact: "payContact",
    bank: "payBank",
    offline: "payOffline",
    wechat: "payWechat",
    alipay: "payAlipay",
  };

  if (result) {
    return (
      <>
<PageTitle title={t("checkoutTitle") || "结算"} fallback="VALTRIX VALTRIX" />
      <>
        <PageHero title={t("orderSuccess")} titleEn="Order Submitted" subtitle={t("shopNotice")} subtitleEn="Our sales consultant will contact you within 1-2 business days." breadcrumb={t("orderSuccess")} breadcrumbEn="Order Submitted" />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <div className="mt-6 text-3xl font-bold text-dark-800">{t("orderSuccess")}</div>
          <div className="mt-4 rounded-xl border border-dark-100 bg-white p-6 text-left">
            <div className="flex justify-between py-1.5">
              <span className="text-dark-500">{t("orderNo")}</span>
              <span className="font-semibold text-dark-800">{result.orderNo}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-dark-500">{t("shopTotal")}</span>
              <span className="font-semibold" style={{ color: "var(--color-primary, #CC0000)" }}>¥{Number(result.amount).toLocaleString()}</span>
            </div>
            {Number(result.discountAmount) > 0 && (
              <>
                <div className="flex justify-between py-1.5">
                  <span className="text-dark-500">优惠券{result.couponCode ? `（${result.couponCode}）` : ""}</span>
                  <span className="font-medium text-dark-400">-¥{Number(result.discountAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-medium text-dark-700">实付</span>
                  <span className="font-semibold" style={{ color: "var(--color-primary, #CC0000)" }}>¥{Number(result.payAmount).toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-dark-500">{t("orderPayMethod")}</span>
              <span className="font-medium text-dark-700">{t(PAY_KEY[form.payMethod]) || form.payMethod}</span>
            </div>
          </div>
          <div className="mt-6 text-sm text-dark-400">{t("shopNotice")}</div>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/shop" className="rounded-lg px-6 py-3 font-medium text-white"
              style={{ background: "var(--color-primary, #CC0000)" }}>
              {t("continueShopping")}
            </Link>
            <Link href={`/shop/order/${result.orderNo}`} className="rounded-lg border border-dark-200 px-6 py-3 font-medium text-dark-600 hover:bg-dark-50">
              {t("orderQuery")}
            </Link>
          </div>
        </div>
      </>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PageHero title={t("checkoutTitle")} titleEn="Order Information" subtitle={t("shopSubtitle")} subtitleEn="Featured products, order online" breadcrumb={t("checkoutTitle")} breadcrumbEn="Order Information" />
        <div className="py-24 text-center">
          <p className="text-dark-400">{t("emptyCart")}</p>
          <Link href="/shop" className="mt-6 inline-block rounded-lg px-6 py-3 font-medium text-white"
            style={{ background: "var(--color-primary, #CC0000)" }}>
            {t("continueShopping")}
          </Link>
        </div>
      </>
    );
  }

  const labelCls = "block text-sm font-medium text-dark-700";
  const inputCls = "mt-1 w-full rounded-lg border border-dark-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none";

  return (
    <>
      <PageHero title={t("checkoutTitle")} titleEn="Order Information" subtitle={t("shopSubtitle")} subtitleEn="Featured products, order online" breadcrumb={t("checkoutTitle")} breadcrumbEn="Order Information" />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* 表单 */}
          <div className="lg:col-span-3 rounded-2xl border border-dark-100 bg-white p-6">
            <h2 className="mb-5 text-lg font-semibold text-dark-800">{t("checkoutTitle")}</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>{t("orderName")} *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>{t("orderPhone")} *</label>
                  <input className={inputCls} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{t("orderEmail")} *</label>
                  <input className={inputCls} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("orderCompany")}</label>
                <input className={inputCls} value={form.company} onChange={(e) => setField("company", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("orderPoNo")}</label>
                <input className={inputCls} placeholder={t("orderPoNoPlaceholder")} value={form.poNo} onChange={(e) => setField("poNo", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>发票抬头</label>
                <input className={inputCls} placeholder="公司全称，会员中心可预设" value={form.invoiceTitle} onChange={(e) => setField("invoiceTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>税号</label>
                <input className={inputCls} placeholder="纳税人识别号（选填）" value={form.taxNo} onChange={(e) => setField("taxNo", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("orderAddress")}</label>
                <input className={inputCls} value={form.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("orderRemark")}</label>
                <textarea className={inputCls} rows={3} value={form.remark} onChange={(e) => setField("remark", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("orderPayMethod")}</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["contact", "bank", "offline", "wechat", "alipay"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setField("payMethod", m)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        form.payMethod === m
                          ? "border-primary text-primary"
                          : "border-dark-200 text-dark-600 hover:bg-dark-50"
                      }`}
                      style={form.payMethod === m ? { borderColor: "var(--color-primary, #CC0000)", color: "var(--color-primary, #CC0000)" } : undefined}
                    >
                      {t(PAY_KEY[m])}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
            </div>
          </div>
          {/* 订单摘要 */}
          <div className="lg:col-span-2 rounded-2xl border border-dark-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-dark-800">{t("cartTitle")}</h2>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.slug + (it.specText || "")} className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-dark-700">
                    {locale === "zh" ? it.name : it.nameEn || it.name} × {it.qty}
                    {it.specText ? <span className="ml-1 text-xs text-dark-400">（{it.specText}）</span> : null}
                  </span>
                  <span className="shrink-0 font-medium text-dark-800">
                    {(() => {
                      const dp = displayUnitPrice(it, it.qty);
                      if (dp.price !== null) return `¥${(dp.price * it.qty).toLocaleString()}`;
                      return t("priceNegotiable");
                    })()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-between border-t border-dark-100 pt-4 text-base">
              <span className="font-medium text-dark-700">{t("shopTotal")}</span>
              <span className="text-xl font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>
                ¥{total.toLocaleString()}
              </span>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--color-primary, #CC0000)" }}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t("orderSubmit")}
            </button>
            <p className="mt-3 text-xs text-dark-400">{t("shopNotice")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
