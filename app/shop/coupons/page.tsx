"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { TicketPercent } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

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
      if (d.ok) setTip("领取成功！可在购物车选择使用");
      else setTip(d.error || "领取失败");
      load();
    } catch {
      setTip("网络错误");
    } finally {
      setClaiming("");
    }
  };

  const valueOf = (c: CouponItem) => (c.type === "percent" ? `${c.amount / 10} 折` : `¥${c.amount.toLocaleString()}`);
  const condOf = (c: CouponItem) => (c.type === "percent" ? (c.maxDiscount ? `最高减 ¥${c.maxDiscount}` : "不限门槛") : c.minAmount > 0 ? `满 ¥${c.minAmount} 可用` : "无门槛");

  return (
    <>
      <PageHero title="领券中心" titleEn="Coupon Center" subtitle="领取专属优惠，下单更划算" subtitleEn="Claim coupons and save on your order" breadcrumb="领券中心" breadcrumbEn="Coupon Center" />
      <div className="mx-auto max-w-5xl px-4 py-12">
        {!loggedIn && (
          <div className="mb-6 rounded-xl border border-dark-100 bg-white p-4 text-sm text-dark-500">
            登录会员后可领取优惠券，
            <Link href="/member/login" className="underline" style={{ color: "var(--color-primary, #CC0000)" }}>去登录</Link>
          </div>
        )}
        {tip && <p className="mb-4 text-sm text-green-600">{tip}</p>}

        {list.length === 0 ? (
          <p className="py-20 text-center text-dark-400">暂无可领取的优惠券</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <div key={c.code} className={`rounded-2xl border bg-white p-5 ${c.effective ? "border-dark-100" : "border-dark-100 opacity-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TicketPercent className="h-5 w-5" style={{ color: "var(--color-primary, #CC0000)" }} />
                    <span className="font-semibold text-dark-800">{loc.get(c, "name") || c.name}</span>
                  </div>
                  {!c.effective && <span className="rounded-full bg-dark-50 px-2 py-0.5 text-[11px] text-dark-400">已结束</span>}
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold" style={{ color: "var(--color-primary, #CC0000)" }}>{valueOf(c)}</span>
                  <span className="ml-2 text-sm text-dark-400">{condOf(c)}</span>
                </div>
                <p className="mt-2 text-xs text-dark-400">
                  {c.endAt ? `有效期至 ${new Date(c.endAt).toLocaleDateString()}` : "长期有效"}
                </p>
                <button
                  onClick={() => claim(c.code)}
                  disabled={!c.canClaim || claiming === c.code}
                  className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--color-primary, #CC0000)" }}
                >
                  {claiming === c.code ? "领取中..." : c.myClaimed > 0 ? "已领取" : !loggedIn ? "登录后领取" : "领取"}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-dark-400">
          已有优惠券码？直接在购物车结算时输入即可使用，无需领取。
        </p>
      </div>
    </>
  );
}
