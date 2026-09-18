"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Download, Calendar, FileText, ChevronLeft, FileImage, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { HeroBackground } from "@/lib/page-hero-config";
import DownloadGateButton from "@/components/ui/DownloadGateButton";

interface PageProps {
  params: { type: string };
}

const iconMap: Record<string, any> = {
  FileText,
  Award,
  FileImage,
};

interface ResourceCategory {
  id: string;
  type: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  items: ResourceItem[];
}

interface ResourceItem {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  format: string;
  size: string;
  fileUrl: string;
  publishedAt: string;
}

export default function ResourceCategoryPage({ params }: PageProps) {
  const { locale , t} = useI18n();
    const loc = createLocalizedGetter(locale);
  const [category, setCategory] = useState<ResourceCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/resources?type=${params.type}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // API返回所有分类，找到匹配的
          const found = data.find((c: ResourceCategory) => c.type === params.type);
          if (found) {
            setCategory(found);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  // 分类不存在：友好 404（不再依赖 notFound 抛错，避免永久加载中）
  if (!category) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center bg-white">
        <div className="container text-center py-20">
          <div className="text-7xl font-bold text-dark-200 mb-4">404</div>
          <h1 className="text-2xl font-bold text-dark mb-2">资源分类不存在</h1>
          <p className="text-dark-400 mb-8">该分类已被移除或路径有误</p>
          <Link href="/resources" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors">
            <ChevronLeft size={18} className="rtl-flip" />
            {t("backToResources")}
          </Link>
        </div>
      </section>
    );
  }

  const Icon = iconMap[category.icon] || FileText;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
      return dateStr.substring(0, 10);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 判断是否有下载链接
  const hasDownloadUrl = (url: string) => url && url !== "#" && url.trim() !== "";

  return (
    <>
      <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
        <HeroBackground />
        <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
        <div className="container relative">
          <Link href="/resources" className="inline-flex items-center gap-1 text-dark-300 hover:text-primary text-sm mb-6 transition-colors">
            <ChevronLeft size={16} />
            {t("backToResources")}
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon size={28} className="text-primary" />
            </div>
            <div>
              <div className="w-16 h-1 bg-primary mb-3" />
              <h1 className="text-4xl lg:text-5xl font-bold text-white">
                {loc.get(category, "title")}
              </h1>
            </div>
          </div>
          <p className="text-xl text-dark-200 max-w-2xl">
            {loc.get(category, "description")}
          </p>
          <div className="mt-6 flex items-center gap-2 text-dark-400 text-sm">
            <FileText size={16} />
            <span>{category.items.length} {t("documentsAvailable")}</span>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.items.map((item, index) => {
              const hasUrl = hasDownloadUrl(item.fileUrl);
              return (
                <div
                  key={item.id}
                  className={`group bg-white border border-dark-100 rounded-xl overflow-hidden transition-all duration-300 flex flex-col ${
                    hasUrl ? "hover:border-primary hover:shadow-xl" : "opacity-75"
                  }`}
                >
                  {/* 封面预览区域 */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-dark-800 to-primary-900 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                      backgroundSize: "30px 30px",
                    }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`w-16 h-20 rounded-md flex items-center justify-center mb-3 transition-transform duration-300 ${
                        hasUrl ? "bg-white/10 group-hover:scale-110" : "bg-gray-500/20"
                      }`}>
                        <FileText size={32} className={hasUrl ? "text-white/70" : "text-gray-400"} />
                      </div>
                      <span className={`text-xs font-medium uppercase tracking-wider ${
                        hasUrl ? "text-white/50" : "text-gray-500"
                      }`}>{item.format}</span>
                    </div>
                    <div className={`absolute top-3 left-3 text-white text-xs px-2.5 py-1 rounded-full font-medium ${
                      hasUrl ? "bg-primary" : "bg-gray-500"
                    }`}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {!hasUrl && (
                      <div className="absolute top-3 right-3 bg-gray-600 text-white text-xs px-2 py-1 rounded">
                        暂无下载
                      </div>
                    )}
                  </div>

                  {/* 内容区域 */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className={`text-lg font-bold mb-2 line-clamp-2 transition-colors ${
                      hasUrl ? "text-dark group-hover:text-primary" : "text-gray-500"
                    }`}>
                      {loc.get(item, "title")}
                    </h3>
                    <p className="text-dark-500 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                      {loc.get(item, "description")}
                    </p>

                    {/* 元信息 */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-dark-400 mb-4 pb-4 border-b border-dark-100">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {item.format}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download size={12} />
                        {item.size || "-"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>

                    {/* 下载按钮 - 无链接时显示灰色 */}
                    {hasUrl ? (
                      <DownloadGateButton
                        href={item.fileUrl}
                        resourceName={loc.get(item, "title")}
                        track={{ type: "resource", id: Number(item.id) }}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white px-5 py-3 rounded-lg font-medium text-sm transition-all group-hover:shadow-lg"
                      >
                        <Download size={16} />
                        {t("download")}
                      </DownloadGateButton>
                    ) : (
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-400 px-5 py-3 rounded-lg font-medium text-sm cursor-not-allowed"
                      >
                        <Download size={16} />
                        {t("notAvailable")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("needMoreResources")}</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">{t("contactDocsDesc")}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all">
            {t("contactTechSupport")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </>
  );
}
