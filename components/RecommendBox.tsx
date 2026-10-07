"use client";

/**
 * 猜你喜欢（AI 内容推荐 · ai-recommend 插件）
 * - 插件未启用：不渲染、不发浏览足迹
 * - 启用：进入页面时上报浏览足迹（view 事件），并异步加载协同过滤推荐
 * 挂载在内容详情页（产品/新闻等）尾部。
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import FitImage from "@/components/ui/FitImage";

interface RecItem {
  id: string;
  name: string;
  image?: string;
  href: string;
  /** 以下三项仅新闻推荐返回（用于与「相关新闻」卡片版式对齐） */
  categoryName?: string;
  summary?: string;
  date?: string;
}

/**
 * 「猜你喜欢」区块的文案（i18n 字典里没有对应键，先就地兜底 6 语种）。
 * 「阅读更多」用统一的 `t("readMore")`。
 */
const TITLE: Record<string, string> = {
  zh: "猜你喜欢",
  en: "You May Also Like",
  ja: "おすすめ",
  ko: "추천 콘텐츠",
  fr: "Vous aimerez aussi",
  ar: "قد يعجبك أيضاً",
};
const HINT: Record<string, string> = {
  zh: "根据浏览行为智能推荐",
  en: "Recommended based on browsing behaviour",
  ja: "閲覧履歴に基づくおすすめ",
  ko: "열람 기록 기반 추천",
  fr: "Recommandé selon votre navigation",
  ar: "توصيات مستندة إلى سلوك التصفح",
};

export default function RecommendBox({
  targetType,
  targetId,
  locale = "zh",
}: {
  targetType: "product" | "news";
  targetId: string;
  locale?: string;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<RecItem[]>([]);
  /**
   * 占位图用的站点 LOGO（owner 2026-10-07：「占位图也适用于产品详情页 …… 以及猜你喜欢部分」）
   * —— 与产品列表卡片 / 详情页主图同源：`/api/public/site-config?key=logo`，兜底 `/images/logo.png`；
   *   两站各取本站配置 ⇒ 左文站显示左文 LOGO。
   */
  const [siteLogo, setSiteLogo] = useState("");
  useEffect(() => {
    fetch("/api/public/site-config?key=logo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setSiteLogo(String(d.data));
      })
      .catch(() => {});
  }, []);

  const [active, setActive] = useState(false);

  const fmtDate = (v?: string) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

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

  const isNews = targetType === "news";

  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles size={20} className="text-primary" />
          <h2 className="text-2xl font-bold text-dark">{TITLE[locale] || TITLE.zh}</h2>
          <span className="text-xs text-gray-400 ml-2">{HINT[locale] || HINT.zh}</span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${isNews ? "max-w-5xl mx-auto" : ""}`}>
          {items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={
                isNews
                  ? // 与新闻详情页「相关新闻」卡片完全同一套版式（owner 2026-09-29：
                    // 「图片显得太突兀，采用和相关新闻一样的版式」）
                    "group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                  : "group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
              }
            >
              {isNews ? (
                <>
                  {/* 16:9 与「相关新闻」一致；无图用同款占位图（不再是纯色/首字母块） */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center overflow-hidden">
                    {/*
                      无图占位（owner 2026-10-07：「占位图也适用于 …… 猜你喜欢部分」）：
                      原来铺 `/placeholders/generic-tech.webp`（车间照，易被误认为实拍），
                      现统一为**灰底 + 45% 透明 LOGO**，与产品列表/详情页完全一致。
                    */}
                    {it.image ? (
                      <FitImage
                        src={it.image}
                        alt={it.name}
                        loading="lazy"
                        fallbackSrc={siteLogo || "/images/logo.png"}
                        className="w-full h-full relative"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-dark-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={siteLogo || "/images/logo.png"}
                          alt={it.name}
                          className="max-w-[70%] max-h-[45%] w-auto h-auto object-contain opacity-[0.45]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {it.categoryName ? (
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded">{it.categoryName}</span>
                      ) : null}
                      {it.date ? (
                        <span className="text-dark-400 text-xs flex items-center gap-1">
                          <Calendar size={12} />
                          {fmtDate(it.date)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-bold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {it.name}
                    </h3>
                    {it.summary ? (
                      <p className="text-dark-500 text-sm line-clamp-2 mb-4">{it.summary}</p>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {t("readMore")}
                      <ArrowRight size={14} className="rtl-flip" />
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* 产品推荐位：与列表页/详情页统一 —— 正方形 1:1 + 图片铺满
                      （owner 2026-09-25：比例与铺满要**同时**生效；产品图是 1000×1000 方图，不裁切） */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {it.image ? (
                      <FitImage
                        src={it.image}
                        alt={it.name}
                        loading="lazy"
                        fallbackSrc={siteLogo || "/images/logo.png"}
                        className="w-full h-full relative"
                      />
                    ) : (
                      /* 无图占位：与列表/详情页统一（灰底 + 45% 透明 LOGO），不再用首字母块 */
                      <div className="w-full h-full flex items-center justify-center bg-dark-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={siteLogo || "/images/logo.png"}
                          alt={it.name}
                          className="max-w-[70%] max-h-[45%] w-auto h-auto object-contain opacity-[0.45]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-dark group-hover:text-primary transition-colors text-sm line-clamp-2">
                      {it.name}
                    </h3>
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
