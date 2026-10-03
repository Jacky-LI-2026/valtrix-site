"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { canSeePrice, applyDiscount, formatPrice, tierPrice, type PricingMode } from "@/lib/pricing";
import { addToQuoteCart } from "@/lib/quote-cart";

/**
 * 前台价格显示组件（受后台「定价与价格显示」策略控制）
 *
 * 模式：
 * - hidden        不显示价格（默认）
 * - public        直接显示
 * - byCustomerType 按客户分类（配件价仅整机/配件客户）
 * - emailVerify   点击「查看价格」→ 邮箱验证 → 显示
 * - emailQuote    点击「获取报价」→ 邮箱验证 → 报价发送到邮箱
 */
export default function PriceDisplay(props: {
  mode: PricingMode;
  isParts?: boolean;
  price?: number | null;
  priceTiers?: { qty: number; price: number }[] | null;
  currency?: string;
  productId?: string | number | null;
  productName?: string;
  memberCustomerType?: string | null;
  memberCanSeeParts?: boolean;
  locale?: string;
  /** 隐藏时是否显示「询价」入口链接（默认 true） */
  showInquiry?: boolean;
}) {
  const {
    mode, isParts = false, price, priceTiers, currency = "¥",
    productId, productName, memberCustomerType, memberCanSeeParts = false, locale = "zh", showInquiry = true,
  } = props;

  const [verified, setVerified] = useState(false);
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<"send" | "confirm">("send");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const router = useRouter();

  /**
   * 加入询价车并跳转到询价车页。
   *
   * ⚠️ 2026-09-14 修复（用户报障：「点 Add to quote cart 跳转后购物车仍为空，无 API 请求发出」）：
   *   此处原为 `<a href="/quote/cart">` —— **只跳转、不加购**，所以点完购物车必然为空。
   *   现复用产品详情页 `addToCart()` 的**同一套本地协议**：
   *     存储键 `quote_cart`，元素形如 `{ id: <产品 slug>, qty: number }`，
   *     并派发 `quote-cart-updated` 事件，让浮动购物车按钮/角标实时同步。
   *   询价车本来就是**纯前端 localStorage**（提交时才调 /api/public/quote 等接口），
   *   因此"没有 API 请求"属预期行为，不是缺陷；缺陷是**没有写入**。
   */
  const addToQuoteCartAndGo = useCallback(() => {
    const id = productId != null ? String(productId) : "";
    // 复用 lib/quote-cart.ts 的**单一真源**协议（与产品详情页加购行为完全一致）
    if (id) addToQuoteCart(id, 1);
    router.push("/quote/cart");
  }, [productId, router]);

  // 会话级已验证标记（emailVerify 模式）
  useEffect(() => {
    try {
      if (sessionStorage.getItem("zw_price_verified")) setVerified(true);
    } catch { /* ignore */ }
  }, []);

  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  const view = canSeePrice(mode, isParts, memberCustomerType, memberCanSeeParts, verified);

  async function sendCode() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/public/price/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.message || "发送失败"); setBusy(false); return; }
      if (d.devMode && d.code) {
        // 开发模式：验证码回显
        setErr("开发模式验证码：" + d.code);
      } else {
        setErr("");
      }
      setStep("confirm");
    } catch { setErr("网络错误"); }
    setBusy(false);
  }

  async function confirmCode() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/public/price/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, productId: productId ? String(productId) : null }),
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.message || "验证失败"); setBusy(false); return; }
      if (mode === "emailQuote") {
        setDoneMsg(d.message || "报价已发送到您的邮箱");
        setModal(false);
        return;
      }
      try { sessionStorage.setItem("zw_price_verified", email); } catch { /* ignore */ }
      setVerified(true);
      setModal(false);
    } catch { setErr("网络错误"); }
    setBusy(false);
  }

  // 折扣后价格（登录会员按分类/等级折扣）
  const [typeDiscount, setTypeDiscount] = useState(0);
  const [levelDiscount, setLevelDiscount] = useState(0);
  useEffect(() => {
    if (!memberCustomerType) return;
    fetch("/api/public/member")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setTypeDiscount(Number(d.typeDiscount) || 0);
          setLevelDiscount(Number(d.levelDiscount) || 0);
        }
      })
      .catch(() => {});
  }, [memberCustomerType]);

  // 展示价：阶梯价取默认档（qty=1 档）或单价；应用折扣
  const basePrice = price ?? tierPrice(priceTiers, 1);
  const finalPrice = basePrice !== null ? applyDiscount(basePrice, typeDiscount, levelDiscount) : null;
  const hasDiscount = (typeDiscount || levelDiscount) > 0 && basePrice !== null;

  if (view.visible && finalPrice !== null) {
    return (
      <div className="inline-flex items-baseline gap-2">
        <span className="text-2xl font-bold text-red-600">{formatPrice(finalPrice, currency)}</span>
        {hasDiscount && (
          <span className="text-sm text-gray-400 line-through">{formatPrice(basePrice, currency)}</span>
        )}
        {hasDiscount && (
          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
            {t("会员价", "Member")} {Math.max(typeDiscount, levelDiscount)}%
          </span>
        )}
        {priceTiers && priceTiers.length > 0 && (
          <span className="text-xs text-gray-400">
            {t("批量采购可享阶梯价", "Volume pricing available")}
          </span>
        )}
      </div>
    );
  }

  // 不可见 → 按原因渲染占位 + 操作按钮
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {view.reason === "parts" && (
          <span className="text-sm text-gray-500">
            {t("配件价格仅对整机客户/配件客户开放", "Parts pricing available for machine & parts customers")}
          </span>
        )}
        {view.reason === "login" && (
          <a href="/member/login" className="text-sm text-blue-600 hover:underline">
            {t("登录后查看价格", "Login to view price")}
          </a>
        )}
        {view.needVerify && (
          <button
            onClick={() => { setModal(true); setStep("send"); setDoneMsg(""); setErr(""); }}
            className="inline-flex items-center gap-1 text-sm text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50"
          >
            {mode === "emailQuote"
              ? t("获取报价", "Get Quote")
              : t("查看价格", "View Price")}
          </button>
        )}
        {!view.needVerify && view.reason !== "login" && view.reason !== "parts" && (
          <span className="text-sm text-gray-400">{t("价格面议", "Price on request")}</span>
        )}
      </div>
      {showInquiry && (view.reason === "hidden" || view.reason === "parts") && (
        <button
          type="button"
          onClick={addToQuoteCartAndGo}
          className="text-xs text-gray-500 hover:text-red-600 underline"
        >
          {t("加入询价车获取报价 →", "Add to quote cart →")}
        </button>
      )}
      {doneMsg && <div className="text-sm text-green-600">{doneMsg}</div>}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold mb-1">
              {mode === "emailQuote" ? t("获取报价", "Get Quote") : t("验证邮箱查看价格", "Verify to view price")}
            </h3>
            {productName && <p className="text-xs text-gray-500 mb-4">{productName}</p>}
            {step === "send" ? (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder={t("输入邮箱地址", "Enter your email")}
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {mode === "emailQuote" && (
                  <p className="text-xs text-gray-400">
                    {t("验证通过后，报价明细将发送到该邮箱", "Quote details will be sent to this email")}
                  </p>
                )}
                {err && <p className="text-xs text-amber-600">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setModal(false)} className="flex-1 border rounded py-2 text-sm text-gray-600">取消</button>
                  <button onClick={sendCode} disabled={busy || !email} className="flex-1 bg-red-600 text-white rounded py-2 text-sm hover:bg-red-700 disabled:opacity-50">
                    {busy ? "..." : t("发送验证码", "Send code")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{t("验证码已发送至", "Code sent to")} <b>{email}</b></p>
                <input
                  placeholder={t("输入 6 位验证码", "Enter 6-digit code")}
                  className="w-full border rounded px-3 py-2 text-sm tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                {err && <p className="text-xs text-amber-600">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setStep("send")} className="flex-1 border rounded py-2 text-sm text-gray-600">返回</button>
                  <button onClick={confirmCode} disabled={busy || code.length < 6} className="flex-1 bg-red-600 text-white rounded py-2 text-sm hover:bg-red-700 disabled:opacity-50">
                    {busy ? "..." : t("验证并查看", "Verify")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 便捷 Hook：获取价格显示策略 + 当前会员客户分类 */
export function usePricingContext(locale: string) {
  const [ctx, setCtx] = useState<{
    mode: PricingMode;
    memberCustomerType: string | null;
    memberCanSeeParts: boolean;
  }>({ mode: "hidden", memberCustomerType: null, memberCanSeeParts: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/public/pricing-config").then((r) => r.json()).catch(() => null),
      fetch("/api/public/member").then((r) => r.json()).catch(() => null),
    ]).then(([pc, me]) => {
      if (cancelled) return;
      const mode = (pc?.mode as PricingMode) || "hidden";
      const m = me?.ok ? me.member : null;
      const ct = m?.customerType || null;
      const ctInfo = (pc?.customerTypes || []).find((c: any) => c.key === ct);
      setCtx({
        mode,
        memberCustomerType: ct,
        memberCanSeeParts: Boolean(m && (m.seePartsPrice ?? ctInfo?.seePartsPrice)),
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  return ctx;
}

// 供 PriceDisplay 计算展示价（导出复用）
export { applyDiscount, formatPrice, tierPrice };
