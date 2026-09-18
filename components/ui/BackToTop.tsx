"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** 全站返回顶部悬浮按钮（置于左下角，避免与右下角 AI 客服/询价车浮动按钮重叠） */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      aria-label="返回顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-4 left-4 z-[80] flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-gray-200 text-gray-600 shadow-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
        <ArrowUp size={18} />
      </span>
    </button>
  );
}
