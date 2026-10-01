"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Tag, ChevronLeft, Share2, FolderOpen, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { preserveLeadingSpaces } from "@/lib/rich-text";
import { useCanSocialPublish } from "@/lib/api/useSocialPublish";
import { HeroBackground, usePageHeroConfig } from "@/lib/page-hero-config";
import ShareModal from "@/components/ui/ShareModal";
import RecommendBox from "@/components/RecommendBox";

// 模板判断已移至 page.tsx 服务端：本文件仅渲染默认主题新闻详情

interface NewsItem {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  summary: string;
  content: string;
  category: { id: string; name: string; nameEn: string; slug: string } | null;
  isFeatured: boolean;
  isTop: boolean;
  publishedAt: string;
  coverImage: string;
  video?: string;
}

interface NewsCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
}

interface PageProps {
  params: { slug: string };
}

function NewsDetailDefaultInner({ params }: PageProps) {
  const { locale , t} = useI18n();
    const loc = createLocalizedGetter(locale);
  const slug = typeof params?.slug === "string" ? decodeURIComponent(params.slug) : "";
  const [mode, setMode] = useState<"detail" | "category" | "notfound" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  /** 是否显示「发布到社媒」（仅登录且有发布权限的后台用户） */
  const canSocialPublish = useCanSocialPublish();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [categoryData, setCategoryData] = useState<{ category: NewsCategory; items: NewsItem[] } | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  /**
   * 页头背景优先级（owner 2026-09-29 口径：「新闻二级页应该**优先用页头设置的图片**」）
   *   ① 后台「页面头部」里为该路径配置的图（`/news/<slug>` 未单独配时，按前缀命中 `/news` 的配置）
   *   ② 都没有 → 退回**文章封面图**
   *   ③ 再没有 → 维持原来的深色底（视觉不回归）
   * ⚠️ 必须放在 `article` 状态声明**之后**（否则 TS2448 块级变量先用后声明）。
   */
  const heroCfg = usePageHeroConfig();
  const heroImage = heroCfg.backgroundImage || article?.coverImage || "";
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) 先按新闻 slug 查询 → 命中则显示新闻详情
    // 2) 未命中则按分类查询（支持 /news/公司新闻、/news/Company News 等路径）→ 显示分类列表页
    // 3) 都不命中 → 404
    let cancelled = false;
    const slug = decodeURIComponent(params.slug);

    async function loadData() {
      try {
        // 先按 slug 查询
        const preview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
        const slugRes = await fetch(`/api/public/news?slug=${encodeURIComponent(slug)}${preview ? "&preview=1" : ""}`);
        if (slugRes.ok) {
          const data = await slugRes.json();
          if (!cancelled) {
            setArticle(data);
            setMode("detail");
          }
          return;
        }

        // 未命中则按分类查询
        const catRes = await fetch(`/api/public/news?category=${encodeURIComponent(slug)}`);
        if (catRes.ok) {
          const data = await catRes.json();
          if (!cancelled) {
            setCategoryData(data);
            setMode("category");
          }
          return;
        }

        // 都不命中
        if (!cancelled) {
          setMode("notfound");
        }
      } catch (err) {
        console.error("加载新闻失败:", err);
        if (!cancelled) {
          setMode("notfound");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  // 命中详情后加载相关新闻
  useEffect(() => {
    if (mode !== "detail" || !article) return;
    fetch("/api/public/news?limit=4")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRelatedNews(data.filter((n: NewsItem) => n.slug !== article.slug).slice(0, 3));
        }
      })
      .catch(() => {});
  }, [mode, article]);

  // 动态设置浏览器标题（必须在条件 return 之前声明，保证 hooks 顺序一致）
  useEffect(() => {
    if (mode === "detail" && article) {
      document.title = `${loc.get(article, "title")} - VALTRIX`;
    } else if (mode === "category" && categoryData) {
      const n = loc.get(categoryData.category, "name");
      document.title = `${n} - VALTRIX`;
    }
  }, [mode, article, categoryData]);

  if (loading || !mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  // 404 页面
  if (mode === "notfound") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-4xl font-bold text-dark mb-4">404</h1>
        <p className="text-dark-400 mb-6">{t("newsNotFound")}</p>
        <Link href="/news" className="text-primary hover:underline">{t("backToNews")}</Link>
      </div>
    );
  }

  // 404 兜底
  if (mode === "detail" && !article) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ==================== 分类列表页模式 ====================
  if (mode === "category" && categoryData) {
    const catName = loc.get(categoryData.category, "name");
    const items = categoryData.items || [];
    return (
      <>
        <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
          <HeroBackground />
          <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
          <div className="container relative">
            <Link href="/news" className="inline-flex items-center gap-1 text-dark-300 hover:text-primary text-sm mb-6 transition-colors">
              <ChevronLeft size={16} />
              {t("backToNews")}
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs bg-primary text-white px-3 py-1 rounded flex items-center gap-1">
                <FolderOpen size={12} />
                {t("category")}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white max-w-4xl leading-tight">{catName}</h1>
            <p className="text-dark-400 mt-4">{`${items.length} ${t("articleCount")}`}</p>
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-white">
          <div className="container">
            {items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center overflow-hidden">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={loc.get(item, "title")} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/placeholders/generic-tech.webp" alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded flex items-center gap-1">
                          <Tag size={12} />
                          {loc.get(item.category, "name")}
                        </span>
                        <span className="text-dark-400 text-xs flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(item.publishedAt)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {loc.get(item, "title")}
                      </h3>
                      <p className="text-dark-500 text-sm leading-relaxed line-clamp-3 mb-4">{loc.get(item, "summary")}</p>
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                        {t("readMore")}
                        <ArrowRight size={14} className="rtl-flip" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-dark-400">{t("noArticlesInCategory")}</div>
            )}
          </div>
        </section>
      </>
    );
  }

  // ==================== 新闻详情模式 ====================
  // 将content字符串按空行拆分为段落
  const paragraphs = loc.get(article, "content") ? loc.get(article, "content").split(/\n\n+/).filter((p: string) => p.trim()) : [];

  return (
    <>
      <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
        {/*
          文章封面图/页头图作为页头背景（owner 2026-09-29 报障：「此处页头图片是黑色的，后台已设置了图片」）
          原来这里只画了深色底 + 网格，**忽略**了后台设置的图片 ⇒ 页头永远是黑的。
          现改为：有图就铺满做背景 + 加一层深色渐变压暗（保证白色标题可读）；没有图时
          与原来完全一致（不改变既有视觉，符合"无图不回归"）。
        */}
        {heroImage && (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-dark-900/85 via-dark-900/75 to-dark-900/90" />
          </>
        )}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
        <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
        <div className="container relative">
          <Link href="/news" className="inline-flex items-center gap-1 text-dark-300 hover:text-primary text-sm mb-6 transition-colors">
            <ChevronLeft size={16} />
            {t("backToNews")}
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs bg-primary text-white px-3 py-1 rounded">
              {loc.get(article!.category, "name")}
            </span>
            <span className="text-dark-400 text-sm flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(article!.publishedAt)}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white max-w-4xl leading-tight">
            {loc.get(article, "title")}
          </h1>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center mb-10 overflow-hidden">
              {article!.coverImage ? (
                <img
                  src={article!.coverImage}
                  alt={loc.get(article, "title")}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src="/placeholders/generic-tech.webp" alt="" className="w-full h-full object-cover" />
              )}
            </div>
            {article!.video && (
              <div className="mb-10">
                <video
                  controls
                  className="w-full rounded-xl border border-dark-100 bg-black max-h-96"
                  preload="metadata"
                  poster={article!.coverImage || undefined}
                >
                  <source src={article!.video} />
                  {t("browserVideoNotSupported")}
                </video>
              </div>
            )}
            <article
              className="prose prose-lg max-w-none text-dark-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(loc.get(article, "content") || loc.get(article, "summary")) }}
            />
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-dark-100">
              <div className="flex items-center gap-2 text-dark-400 text-sm">
                <Tag size={14} />
                <span>{loc.get(article!.category, "name")}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-2 text-dark-500 hover:text-primary transition-colors text-sm"
                >
                  <Share2 size={16} />
                  {t("share")}
                </button>
                {/* 后台用户专用（owner 2026-10-01，与左文站同步）：点开带参预选进「社媒一键发布」 */}
                {canSocialPublish && (
                  <Link
                    href={`/admin/social-publish?type=news&id=${encodeURIComponent(article?.id || slug)}`}
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 transition-colors text-sm"
                    title="发布到社媒（后台功能）"
                  >
                    <Send size={16} />
                    发布到社媒
                  </Link>
                )}
              </div>
              <ShareModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={loc.get(article, "title")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-dark-50">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("relatedNews")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {relatedNews.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="aspect-[16/9] bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center overflow-hidden">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt={loc.get(item, "title")} className="w-full h-full object-cover" />
                  ) : (
                    <img src="/placeholders/generic-tech.webp" alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded">
                      {loc.get(item.category, "name")}
                    </span>
                    <span className="text-dark-400 text-xs flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(item.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {loc.get(item, "title")}
                  </h3>
                  <p className="text-dark-500 text-sm line-clamp-2 mb-4">{loc.get(item, "summary")}</p>
                  <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                    {t("readMore")}
                    <ArrowRight size={14} className="rtl-flip" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 猜你喜欢（ai-recommend 插件） */}
      <RecommendBox targetType="news" targetId={slug} locale={locale} />

      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("wantLearnMore")}</h2>
          <p className="text-white/80 mb-8">{t("contactProductSupport")}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all">
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}

export default function NewsDetailDefault({ params }: PageProps) {
  return <NewsDetailDefaultInner params={params} />;
}
