"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, Calendar, Building2, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import ShareModal from "@/components/ui/ShareModal";

interface CaseDetail {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  industry: string;
  industryEn?: string;
  client: string;
  clientEn?: string;
  summary: string;
  summaryEn?: string;
  content: string;
  contentEn?: string;
  coverImage?: string | null;
  gallery?: string[] | null;
  caseDate?: string | null;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  related?: CaseDetail[];
}

const CASE_PLACEHOLDER = "/placeholders/generic-tech.webp";
const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};

export default function CaseDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const { locale, t } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/cases/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setItem(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (item) {
      document.title = item.seoTitle || loc.get(item, "title") + " - VALTRIX";
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", item.seoDescription || loc.get(item, "summary") || "");
    }
  }, [item]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-dark-400">{t("loading")}</div>;
  }
  if (!item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-dark-400 gap-3">
        <div>案例不存在或已下线</div>
        <Link href="/cases" className="text-primary text-sm">返回案例列表</Link>
      </div>
    );
  }

  const gallery = Array.isArray(item.gallery) && item.gallery.length ? item.gallery : item.coverImage ? [item.coverImage] : [];
  const imgs = gallery.filter(Boolean) as string[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: loc.get(item, "title"),
    description: loc.get(item, "summary"),
    image: item.coverImage || undefined,
    datePublished: item.caseDate ? new Date(item.caseDate).toISOString() : undefined,
    publisher: { "@type": "Organization", name: "VALTRIX" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={loc.get(item, "title")}
        titleEn={loc.get(item, "titleEn") || undefined}
        subtitle={loc.get(item, "summary")}
        subtitleEn={loc.get(item, "summaryEn") || undefined}
        breadcrumb={t("cases") || "成功案例"}
        breadcrumbEn="Cases"
      />

      <section className="py-12 lg:py-16 bg-white">
        <div className="container max-w-5xl">
          {/* 主图 */}
          <div className="aspect-[16/9] rounded-lg overflow-hidden bg-dark-900 mb-4">
            <img
              src={imgs[activeImg] || CASE_PLACEHOLDER}
              alt={loc.get(item, "title")}
              className="w-full h-full object-cover"
            />
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-24 aspect-video rounded overflow-hidden border-2 transition-colors ${
                    activeImg === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-dark-500 mb-6">
            {fmtDate(item.caseDate) && (
              <span className="flex items-center gap-1.5">
                <Calendar size={15} />
                {fmtDate(item.caseDate)}
              </span>
            )}
            {loc.get(item, "industry") && (
              <span className="flex items-center gap-1.5">
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded">{loc.get(item, "industry")}</span>
              </span>
            )}
            {loc.get(item, "client") && (
              <span className="flex items-center gap-1.5">
                <Building2 size={15} />
                {loc.get(item, "client")}
              </span>
            )}
          </div>

          {/* 正文 */}
          <article
            className="prose prose-dark max-w-none prose-headings:scroll-mt-24"
            dangerouslySetInnerHTML={{ __html: loc.get(item, "content") || loc.get(item, "summary") }}
          />

          {/* 分享 */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-dark-100">
            <div className="text-sm text-dark-400">
              {loc.get(item, "industry") ? loc.get(item, "industry") : ""}
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 text-dark-500 hover:text-primary transition-colors text-sm"
            >
              <Share2 size={16} />
              {t("share")}
            </button>
            <ShareModal
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={loc.get(item, "title")}
            />
          </div>

          {/* 相关案例 */}
          {item.related && item.related.length > 0 && (
            <div className="mt-16 pt-12 border-t border-dark-100">
              <div className="text-center mb-10">
                <h3 className="text-2xl lg:text-3xl font-bold text-dark mb-3">{t("relatedCases") || "相关案例"}</h3>
                <p className="text-dark-400 text-sm">{t("relatedCasesDesc") || "更多同行业成功案例"}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {item.related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/cases/${r.slug}`}
                    className="group bg-white rounded-lg overflow-hidden border border-dark-100 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-dark-900">
                      <img
                        src={r.coverImage || CASE_PLACEHOLDER}
                        alt={loc.get(r, "title")}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-dark group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {loc.get(r, "title")}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-primary text-xs font-medium mt-2">
                        {t("viewDetails") || "查看详情"}
                        <ArrowRight size={12} className="rtl-flip" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
