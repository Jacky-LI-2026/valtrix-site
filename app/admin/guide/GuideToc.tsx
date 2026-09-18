"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

/**
 * 使用说明书 - 侧边目录导航（客户端组件）
 * - 点击章节平滑滚动
 * - 滚动监听高亮当前章节（h2 章节 / h3 小节）
 * - h2 一级导航 + h3 缩进子项
 * - 移动端折叠为顶部下拉
 */
export default function GuideToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  };

  const activeTitle = items.find((i) => i.id === activeId)?.title || "目录导航";

  return (
    <>
      {/* 桌面端：固定侧边目录（sticky 钉在滚动容器内） */}
      <aside className="hidden lg:block w-64 shrink-0 self-start sticky top-6">
        <div className="space-y-0.5 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
            目录导航
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                item.level === 3 ? "pl-6 text-[13px]" : "font-medium"
              } ${
                activeId === item.id
                  ? "bg-red-50 text-red-600"
                  : item.level === 2
                  ? "text-gray-700 hover:bg-gray-50"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              {item.title}
            </button>
          ))}
          <button
            onClick={() => {
              // 从内容区向上找到真实滚动容器并滚回顶部
              let el = document.getElementById("guide-content");
              let scroller: HTMLElement | null = el;
              while (scroller && scroller !== document.body) {
                const st = getComputedStyle(scroller).overflowY;
                if ((st === "auto" || st === "scroll") && scroller.scrollHeight > scroller.clientHeight + 50) break;
                scroller = scroller.parentElement;
              }
              (scroller || document.scrollingElement || document.documentElement).scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-600 mt-3 border-t border-gray-100"
          >
            ↑ 回到顶部
          </button>
        </div>
      </aside>

      {/* 移动端：顶部折叠菜单 */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-gray-200 text-sm text-gray-700"
        >
          <span>{activeTitle}</span>
          <span className="text-gray-400">{mobileOpen ? "▲" : "▼"}</span>
        </button>
        {mobileOpen && (
          <div className="mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-2 max-h-80 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full text-left px-4 py-2 text-sm ${
                  item.level === 3 ? "pl-8 text-[13px] text-gray-500" : "text-gray-700 font-medium"
                } ${activeId === item.id ? "text-red-600" : ""}`}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
