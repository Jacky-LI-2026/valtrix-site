"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { memberT } from "@/lib/member-i18n";

/** 客户门户一级入口：已登录直达 /portal；未登录跳登录页并带 next 回跳 */
export function useMemberLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    fetch("/api/public/member")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && d.member) setLoggedIn(true);
      })
      .catch(() => {});
  }, []);
  return loggedIn;
}

/** 桌面导航：客户门户链接（图标 + 文字，紧邻会员入口） */
export function PortalEntry() {
  const { locale } = useI18n();
  const loggedIn = useMemberLoggedIn();
  const href = loggedIn ? "/portal" : "/member/login?next=/portal";
  return (
    <Link
      href={href}
      aria-label={memberT(locale, "portal")}
      title={memberT(locale, "portal")}
      className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
    >
      <ShieldCheck className="h-5 w-5" />
    </Link>
  );
}

/** 移动端抽屉：客户门户全宽入口 */
export function MobilePortalEntry() {
  const { locale } = useI18n();
  const loggedIn = useMemberLoggedIn();
  const href = loggedIn ? "/portal" : "/member/login?next=/portal";
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
    >
      <ShieldCheck className="h-4 w-4" />
      {memberT(locale, "portal")}
    </Link>
  );
}
