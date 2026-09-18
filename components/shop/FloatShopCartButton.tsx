"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * 全站悬浮"购物车"按钮：仅在商城购物车有内容时显示，
 * 与询价车并排浮动（flex 自动排布，不与 AI 客服重叠）。
 */
export default function FloatShopCartButton() {
  const { t } = useI18n();
  const [cartCount, setCartCount] = useState(0);
  // 商城插件停用时前台隐藏悬浮购物车
  const [mallOn, setMallOn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.ok && data.state) setMallOn(data.state.mall !== false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("shop_cart");
        const arr = raw ? JSON.parse(raw) : [];
        setCartCount(Array.isArray(arr) ? arr.reduce((s: number, x: any) => s + (Number(x.qty) || 1), 0) : 0);
      } catch {
        setCartCount(0);
      }
    };
    read();
    window.addEventListener("shop-cart-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("shop-cart-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (!mallOn || cartCount <= 0) return null;

  return (
    <Link
      href="/shop/cart"
      aria-label={t("cartTitle")}
      className="flex h-14 items-center gap-2 rounded-full px-5 shadow-lg transition-transform hover:scale-105"
      style={{ background: "var(--color-primary, #CC0000)" }}
    >
      <span className="relative">
        <ShoppingBag className="h-5 w-5 text-white" />
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-white text-[11px] font-bold"
          style={{ color: "var(--color-primary, #CC0000)" }}>
          {cartCount}
        </span>
      </span>
      <span className="text-sm font-medium text-white hidden sm:inline">{t("cartTitle")}</span>
    </Link>
  );
}
