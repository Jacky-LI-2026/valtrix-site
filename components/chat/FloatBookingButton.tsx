"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * 全站悬浮"预约参观"按钮：与右下角 AI 客服悬浮按钮并排，
 * 作为考察预约的高曝光转化入口（移动/桌面通用）。
 * 插件 visit-booking 停用时前台隐藏。
 */
export default function FloatBookingButton() {
  const { t } = useI18n();
  const [on, setOn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.ok && data.state) setOn(data.state["visit-booking"] !== false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!on) return null;

  return (
    <Link
      href="/visit-booking"
      aria-label={t("visitBooking")}
      className="flex h-14 items-center gap-2 rounded-full px-5 shadow-lg transition-transform hover:scale-105"
      style={{ background: "var(--color-primary, #CC0000)" }}
    >
      <CalendarCheck className="h-5 w-5 text-white" />
      <span className="text-sm font-medium text-white hidden sm:inline">{t("visitBooking")}</span>
    </Link>
  );
}
