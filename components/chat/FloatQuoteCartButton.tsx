"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * 全站悬浮"询价车"按钮：仅在询价车有内容时显示，
 * 与右下角 AI 客服、预约参观悬浮按钮并排，作为退出页面后的显眼入口。
 */
export default function FloatQuoteCartButton() {
  const { t } = useI18n();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("quote_cart");
        const arr = raw ? JSON.parse(raw) : [];
        setCartCount(Array.isArray(arr) ? arr.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    read();
    window.addEventListener("quote-cart-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("quote-cart-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (cartCount <= 0) return null;

  return (
    <Link
      href="/quote/cart"
      aria-label={t("quoteCartTitle")}
      className="flex h-14 items-center gap-2 rounded-full px-5 shadow-lg transition-transform hover:scale-105"
      style={{ background: "var(--color-primary, #CC0000)" }}
    >
      <span className="relative">
        <ShoppingCart className="h-5 w-5 text-white" />
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-white text-[11px] font-bold"
          style={{ color: "var(--color-primary, #CC0000)" }}>
          {cartCount}
        </span>
      </span>
      <span className="text-sm font-medium text-white hidden sm:inline">{t("quoteCartTitle")}</span>
    </Link>
  );
}
