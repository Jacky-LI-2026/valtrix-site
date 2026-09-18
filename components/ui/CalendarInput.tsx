"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 六语日历选择输入（替换原生 input[type=date]，原生日历界面语言由浏览器决定，无法多语言）。
 * 支持 zh/en/ja/ko/fr/ar，年月标题、星期表头、月份均按 locale 显示。
 */
const MONTHS: Record<string, string[]> = {
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  ko: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

const WEEKDAYS: Record<string, string[]> = {
  zh: ["日", "一", "二", "三", "四", "五", "六"],
  en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  fr: ["D", "L", "M", "M", "J", "V", "S"],
  ar: ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
};

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  locale?: string;
  className?: string;
  placeholder?: string;
}

export default function CalendarInput({ value, onChange, locale = "zh", className, placeholder }: Props) {
  const lang = (MONTHS[locale] ? locale : "zh") as string;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }, []);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const selected = value ? value : "";
  const isRtl = lang === "ar";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const dim = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    return cells;
  }, [view]);

  const prevMonth = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const title = `${MONTHS[lang][view.m]} ${view.y}`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={className || "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-left focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"}
        style={{ color: selected ? "#111827" : "#9ca3af" }}
      >
        {selected || placeholder || "YYYY-MM-DD"}
      </button>
      {open && (
        <div dir={isRtl ? "rtl" : "ltr"} className="absolute z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          {/* 年月标题 + 切换 */}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prevMonth} aria-label="prev" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600">
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <div className="text-sm font-semibold text-gray-800">{title}</div>
            <button type="button" onClick={nextMonth} aria-label="next" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 text-gray-600">
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          {/* 星期表头 */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-400">
            {WEEKDAYS[lang].map((w, i) => (
              <div key={i} className="py-1">{w}</div>
            ))}
          </div>
          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {grid.map((d, i) =>
              d === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const val = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
                    onChange(val);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-md text-sm transition-colors ${
                    selected === `${view.y}-${pad(view.m + 1)}-${pad(d)}`
                      ? "bg-red-600 text-white font-semibold"
                      : today.y === view.y && today.m === view.m && today.d === d
                        ? "text-red-600 font-semibold hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {d}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
