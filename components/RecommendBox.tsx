"use client";

/**
 * 猜你喜欢（AI 内容推荐 · ai-recommend 插件）
 * - 插件未启用：不渲染、不发浏览足迹
 * - 启用：进入页面时上报浏览足迹（view 事件），并异步加载协同过滤推荐
 * 挂载在内容详情页（产品/新闻等）尾部。
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface RecItem {
  id: string;
  name: string;
  image?: string;
  href: string;
}

export default function RecommendBox({
  targetType,
  targetId,
  locale = "zh",
}: {
  targetType: "product" | "news";
  targetId: string;
  locale?: string;
}) {
  const [items, setItems] = useState<RecItem[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    fetch(`/api/public/recommendations?type=${targetType}&id=${encodeURIComponent(targetId)}&limit=6&locale=${locale}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.ok && d.enabled) {
          setActive(true);
          setItems(d.items || []);
          // 插件启用：上报浏览足迹（供协同过滤）
          try {
            let vk = localStorage.getItem("zw_vk");
            if (!vk) {
              vk = "v" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
              localStorage.setItem("zw_vk", vk);
            }
            navigator.sendBeacon(
              "/api/public/analytics/track",
              new Blob(
                [
                  JSON.stringify({
                    events: [
                      {
                        type: "view",
                        targetType,
                        targetId,
                        href: window.location.pathname + window.location.search,
                        visitorKey: vk,
                        lang: document.documentElement.lang || locale,
                      },
                    ],
                  }),
                ],
                { type: "application/json" }
              )
            );
          } catch { /* ignore */ }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [targetType, targetId, locale]);

  if (!active || items.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles size={20} className="text-primary" />
          <h2 className="text-2xl font-bold text-dark">猜你喜欢</h2>
          <span className="text-xs text-gray-400 ml-2">根据浏览行为智能推荐</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
            >
              {/* 推荐位卡片：正方形 1:1 + 图片铺满（与列表页/详情页统一） */}
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-primary font-bold text-2xl">{(it.name || "?").charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-dark group-hover:text-primary transition-colors text-sm line-clamp-2">
                  {it.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
