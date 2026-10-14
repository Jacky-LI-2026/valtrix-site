"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { TicketPercent } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { formatDiscount } from "@/lib/units";

interface CouponItem {
  code: string;
  name: string;
  nameEn: string | null;
  type: string;
  amount: number;
  minAmount: number;
  maxDiscount: number;
  endAt: string | null;
  total: number;
  claimed: number;
  perUser: number;
  effective: boolean;
  stockLeft: number;
  myClaimed: number;
  canClaim: boolean;
}

export default function ShopCouponsPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [list, setList] = useState<CouponItem[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tip, setTip] = useState("");
  const [claiming, setClaiming] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/public/shop/coupons");
      const d = await r.json();
      if (d.ok) {
        setList(d.coupons || []);
        setLoggedIn(!!d.loggedIn);
      }
    } catch {
      /* 忽略 */
    }
  };
  useEffect(() => {
    load();
  }, []);

  const claim = async (code: string) => {
    setTip("");
    setClaiming(code);
    try {
      const r = await fetch("/api/public/shop/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (d.ok) setTip(t("shopClaimOk"));
      else setTip(d.error || t("shopClaimFail"));
      load();
    } catch {
      setTip(t("shopNetErrorShort"));
    } finally {
      setClaiming("");
    }
  };

  // 折扣券：库里 `amount` 是"十折制"（90 = 9 折）⇒ 直接用全站统一的 formatDiscount（中「9折」/ 其余「10% off」）
  const valueOf = (c: CouponItem) =>
    c.type === "percent" ? formatDiscount(c.amount / 10, locale) || `${c.amount / 10} 折` : `¥${c.amount.toLocaleString()}`;
  const condOf = (c: CouponItem) =>
    c.type === "percent"
      ? c.maxDiscount
        ? `${t("shopCouponMaxOff")} ¥${c.maxDiscount}`
        : t("shopCouponNoThreshold")
      : c.minAmount > 0
        ? `${t("shopCouponMinPre")} ¥${c.minAmount} ${t("shopCouponMinSuf")}`
        : t("shopCouponNoMin");

  return (
    <>
      <PageHero title={t("couponCenter")} titleEn="Coupon Center" subtitle={t("shopCouponSub")} subtitleEn="Claim coupons and save on your order" breadcrumb={t("couponCenter")} breadcrumbEn="Coupon Center" />
      <div className="mx-auto max-w-5xl px-4 py-12">
        {!loggedIn && (
          <div className="mb-6 rounded-xl border border-dark-100 bg-white p-4 text-sm text-dark-500">
            {t("shopCouponLogin")}
            <Link href="/member/login" className="underline" style={{ color: "var(--color-primary, #CC0000)" }}>{t("shopGoLogin")}</Link>
          </div>
        )}
        {tip && <p className="mb-4 text-sm text-green-600">{tip}</p>}

        {list.length === 0 ? (
          <p className="py-20 text-center text-dark-400">{t("shopNoCoupons")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <div key={c.code} className={`rounded-2xl border bg-white p-5 ${c.effective ? "border-dark-100" : "border-dark-100 opacity-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TicketPercent className="h-5 w-5" style={{ color: "var(--color-primary, #CC0000)" }} />
                    <span className="font-semibold text-dark-800">{loc.get(c, "name") || c.name}</span>
                  </div>
                  {!c.effective && <span className="rounded-full bg-dark-50 px-2 py-0.5 text-[11px] text-dark-400">{t("shopCouponEnded")}</span>}
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>{valueOf(c)}</span>
                  <span className="ml-2 text-sm text-dark-400">{condOf(c)}</span>
                </div>
                <p className="mt-2 text-xs text-dark-400">
                  {c.endAt ? `${t("shopValidUntil")} ${new Date(c.endAt).toLocaleDateString()}` : t("shopNoExpiry")}
                </p>
                <button
                  onClick={() => claim(c.code)}
                  disabled={!c.canClaim || claiming === c.code}
                  className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--color-primary, #CC0000)" }}
                >
                  {claiming === c.code ? t("shopClaiming") : c.myClaimed > 0 ? t("shopClaimed") : !loggedIn ? t("shopClaimAfterLogin") : t("shopClaim")}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-dark-400">
          {t("shopCouponCodeTip")}
        </p>
      </div>
    </>
  );
}
