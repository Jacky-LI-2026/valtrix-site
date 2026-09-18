"use client";

/**
 * 访客行为埋点（热力图数据源）
 * 采集点击归一化坐标 + 页面滚动深度，节流批量上报到 /api/public/analytics/track
 * 挂在前台根布局，自动运行，不影响任何业务。
 */
import { useEffect, useRef } from "react";

export default function AnalyticsTracker() {
  const buf = useRef<any[]>([]);
  const timer = useRef<any>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const push = (e: any) => {
      try {
        const el = document.body;
        const w = Math.max(el.clientWidth, 1);
        const h = Math.max(el.clientHeight, 1);
        buf.current.push({
          x: Math.round((e.clientX / w) * 1000),
          y: Math.round(((e.clientY + window.scrollY) / (el.scrollHeight || h)) * 1000),
          depth: Math.min(100, Math.round((window.scrollY / Math.max(1, el.scrollHeight - window.innerHeight)) * 100)),
          path: window.location.pathname,
          lang: document.documentElement.lang || "zh",
          t: Date.now(),
        });
      } catch { /* ignore */ }
    };

    const onClick = (e: MouseEvent) => push(e);

    const onScroll = () => {
      // 滚动深度采样（节流 2s）
      try {
        const el = document.body;
        const depth = Math.min(100, Math.round((window.scrollY / Math.max(1, el.scrollHeight - window.innerHeight)) * 100));
        buf.current.push({
          x: -1, y: -1, depth,
          path: window.location.pathname,
          lang: document.documentElement.lang || "zh",
          t: Date.now(),
        });
      } catch { /* ignore */ }
    };

    const send = () => {
      if (buf.current.length === 0) return;
      const now = Date.now();
      if (now - lastSent.current < 5000) return;
      const batch = buf.current;
      buf.current = [];
      lastSent.current = now;
      try {
        navigator.sendBeacon("/api/public/analytics/track", new Blob([JSON.stringify({ events: batch })], { type: "application/json" }));
      } catch { /* ignore */ }
    };

    window.addEventListener("click", onClick, true);
    let scrollT: any = null;
    window.addEventListener("scroll", () => {
      if (scrollT) return;
      scrollT = setTimeout(() => { onScroll(); scrollT = null; }, 2000);
    }, { passive: true });

    timer.current = setInterval(send, 8000);
    window.addEventListener("beforeunload", send);

    return () => {
      send();
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", send);
      clearInterval(timer.current);
    };
  }, []);

  return null;
}
