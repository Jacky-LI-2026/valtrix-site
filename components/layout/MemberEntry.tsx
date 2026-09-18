"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { memberT } from "@/lib/member-i18n";

interface MeInfo {
  member: { id: string; email: string; name: string };
  favCount: number;
}

/** 前台会员入口：未登录显示登录图标，已登录显示昵称 + 下拉（个人中心/退出） */
export default function MemberEntry() {
  const { locale } = useI18n();
  const [me, setMe] = useState<MeInfo | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/public/member")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && d.member) setMe(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!me) {
    return (
      <Link
        href="/member/login"
        aria-label={memberT(locale, "login")}
        title={memberT(locale, "login")}
        className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
      >
        <User className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <div className="relative hidden sm:block" ref={boxRef}>
      <button
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors max-w-[160px]"
        onClick={() => setOpen(!open)}
        aria-label={memberT(locale, "memberCenter")}
      >
        <User className="h-4 w-4 shrink-0" />
        <span className="truncate font-medium">{me.member.name || me.member.email}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-50">
          <Link
            href="/member"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            {memberT(locale, "memberCenter")}
            {me.favCount > 0 && (
              <span className="ms-auto rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">{me.favCount}</span>
            )}
          </Link>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={async () => {
              await fetch("/api/public/member?action=logout", { method: "POST" });
              setMe(null);
              setOpen(false);
              window.location.href = "/";
            }}
          >
            <LogOut className="h-4 w-4" />
            {memberT(locale, "logout")}
          </button>
        </div>
      )}
    </div>
  );
}

/** 移动端会员入口：抽屉导航内的全宽登录/个人中心按钮（MemberEntry 桌面版 hidden sm，移动端需独立入口） */
export function MobileMemberEntry() {
  const { locale } = useI18n();
  const [me, setMe] = useState<MeInfo | null>(null);

  useEffect(() => {
    fetch("/api/public/member")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ok && d.member) setMe(d);
      })
      .catch(() => {});
  }, []);

  if (me) {
    return (
      <div className="flex gap-2">
        <Link
          href="/member"
          className="flex-1 flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
        >
          <User className="h-4 w-4" />
          <span className="truncate max-w-[120px]">{me.member.name || me.member.email}</span>
        </Link>
        <button
          className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
          onClick={async () => {
            await fetch("/api/public/member?action=logout", { method: "POST" });
            window.location.href = "/";
          }}
          aria-label={memberT(locale, "logout")}
          title={memberT(locale, "logout")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/member/login"
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
    >
      <User className="h-4 w-4" />
      {memberT(locale, "login")}
    </Link>
  );
}
