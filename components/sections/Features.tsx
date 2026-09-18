"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import * as LucideIcons from "lucide-react";

interface FeatureItem {
  id?: string;
  icon?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
}

export default function Features() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [features, setFeatures] = useState<FeatureItem[]>([]);

  useEffect(() => {
    fetch("/api/public/home-config")
      .then((r) => r.json())
      .then((data) => {
        const feats = data?.data?.features || [];
        setFeatures(feats);
      })
      .catch(() => {});
  }, []);

  // 没有配置核心优势时不显示
  if (features.length === 0) return null;

  // 动态获取 lucide 图标
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
    return Icon ? <Icon size={32} /> : null;
  };

  return (
    <section className="tpl-section py-20 lg:py-28 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-block w-12 h-1 bg-primary mb-4" />
          <h2 className="tpl-title text-3xl md:text-4xl font-bold text-dark mb-4">{t("coreAdvantages") || "核心优势"}</h2>
          <p className="tpl-scaled text-dark-500 max-w-2xl mx-auto">{t("coreAdvantagesDesc") || "对标国际一流标准研发制造，为客户提供可靠的精密流体控制元件与系统解决方案"}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const title = feature.title?.[locale] || feature.title?.zh || "";
            const description = feature.description?.[locale] || feature.description?.zh || "";
            return (
              <div
                key={feature.id || index}
                className="tpl-card group relative bg-white border border-dark-100 rounded-lg p-8 hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute top-4 end-5 text-5xl font-black text-dark-50 group-hover:text-primary/10 transition-colors">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all relative z-10">
                  {getIcon(feature.icon) || <LucideIcons.Award size={32} />}
                </div>
                <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors relative z-10">
                  {title}
                </h3>
                <p className="text-dark-500 text-sm leading-relaxed relative z-10">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
