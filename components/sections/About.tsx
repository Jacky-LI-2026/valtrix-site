"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

export default function About() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const pickLang = (v: any, fallback = "") =>
    v && typeof v === "object" ? (v[locale] || v.zh || fallback) : (v || fallback);
  const [aboutData, setAboutData] = useState<any>(null);

  // 从API获取关于我们内容
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/about?slug=profile")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.id) {
          setAboutData(data);
        }
      })
      .catch((err) => {
        console.warn("获取关于我们内容失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 从API数据构建特性列表（后缀式 label/labelJa... 用 loc.get 取，缺则回退字典）
  const features: string[] = aboutData?.highlights && aboutData.highlights.length > 0
    ? aboutData.highlights.map((h: any) => loc.get(h, "label") || loc.get(h, "value") || "")
    : [t("feature1"), t("feature2"), t("feature3"), t("feature4")];

  // 从API数据获取标题和描述（按 locale 取，缺语种回退中文）
  const contentArr = loc.getArray(aboutData, "content");
  const title = loc.get(aboutData, "title") || t("aboutTitle");

  const description1 = contentArr?.[0]?.paragraphs?.[0] || t("aboutDesc1");

  const description2 = contentArr?.[0]?.paragraphs?.[1] || t("aboutDesc2");

  const foundedYear = aboutData?.timeline?.[0]?.year || "2016";

  return (
    <section className="tpl-section py-20 lg:py-28 bg-dark-50">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-dark-800 to-primary-900 relative">
              <img
                src={aboutData?.image || "/placeholders/about.webp"}
                alt={t("valtrixEquipment")}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
            </div>
            <div className="tpl-card absolute -bottom-6 -right-6 bg-white rounded-lg shadow-xl p-6 hidden md:block">
              <div className="text-3xl font-bold text-primary mb-1">{foundedYear}</div>
              <div className="text-dark-500 text-sm">{t("foundedYear")}</div>
            </div>
          </div>

          {/* Right content */}
          <div>
            <div className="w-12 h-1 bg-primary mb-4" />
            <h2 className="tpl-title text-3xl md:text-4xl font-bold text-dark mb-6">
              {title}
            </h2>
            <p className="tpl-scaled text-dark-600 leading-relaxed mb-6 text-justify">
              {description1}
            </p>
            <p className="tpl-scaled text-dark-600 leading-relaxed mb-8 text-justify">
              {description2}
            </p>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-primary shrink-0" />
                  <span className="text-dark-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/about"
              className="btn-primary inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded font-medium transition-all hover:gap-3 group"
            >
              {t("learnMore")}
              <ArrowRight size={18} className="rtl-flip group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
