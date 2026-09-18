"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Settings, Microwave, Wrench, Headphones } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";

const iconMap: Record<string, any> = {
  Settings,
  Microwave,
  Wrench,
  Headphones,
};

const defaultServices = [
  {
    icon: Settings,
    title: "技术支持",
    titleEn: "Technical Support",
    description: "提供超高纯管阀件选型计算、工况评估、安装指导与现场技术服务，覆盖售前、售中、售后全周期。",
    descriptionEn: "Providing UHP valve and fitting selection, working-condition evaluation, installation guidance and on-site technical service throughout the whole lifecycle.",
    href: "/services/technical-support",
    highlight: true,
  },
  {
    icon: Wrench,
    title: "定制加工",
    titleEn: "Custom Manufacturing",
    description: "特殊材质与超高纯表面处理定制，根据客户需求提供从设计、加工到检测的全流程定制服务。",
    descriptionEn: "Custom manufacturing with special materials and ultra-high purity surface treatment, from design and machining to inspection.",
    href: "/services/custom-manufacturing",
    highlight: false,
  },
  {
    icon: Headphones,
    title: "维护与备件",
    titleEn: "Maintenance & Spare Parts",
    description: "高纯系统检修与备件供应，提供产品维护、故障排查、快速响应等服务，保障客户生产连续性。",
    descriptionEn: "High-purity system maintenance and spare parts supply with troubleshooting and fast response to ensure continuity.",
    href: "/services/maintenance-service",
    highlight: false,
  },
  {
    icon: Settings,
    title: "培训与咨询",
    titleEn: "Training & Consulting",
    description: "提供安装、焊接与维护专业培训及系统方案咨询，帮助客户建立规范的超高纯系统操作能力。",
    descriptionEn: "Professional training in installation, welding and maintenance, plus system consulting to build standard UHP operation capability.",
    href: "/services/training-consulting",
    highlight: false,
  },
];

export default function Services() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [servicesData, setServicesData] = useState<any[]>([]);

  // 从API获取服务内容
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/services")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setServicesData(data);
        }
      })
      .catch((err) => {
        console.warn("获取服务内容失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 从API数据构建服务列表
  const services = servicesData.length > 0
    ? servicesData.map((service: any, index: number) => ({
        ...service,
        icon: iconMap[service.icon] || defaultServices[index % defaultServices.length].icon,
        title: service.title || service.titleEn || "",
        titleEn: service.titleEn || service.title || "",
        description: service.description || service.subtitle || "",
        descriptionEn: service.descriptionEn || service.subtitleEn || service.description || "",
        href: `/services/${service.slug}`,
        highlight: index === 1,
      }))
    : defaultServices;

  return (
    <section className="tpl-section py-20 lg:py-28 bg-dark-900 relative overflow-hidden">
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
      <div className="absolute -top-1/2 end-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="text-center mb-16">
          <div className="inline-block w-12 h-1 bg-primary mb-4" />
          <h2 className="tpl-title text-3xl md:text-4xl font-bold text-white mb-4">{t("services")}</h2>
          <p className="tpl-scaled text-dark-300 max-w-2xl mx-auto">
            {t("servicesDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Link
                key={index}
                href={service.href}
                className={`tpl-card group relative rounded-lg p-8 transition-all duration-300 ${
                  service.highlight ? "bg-primary hover:bg-primary-600" : "bg-dark-800 hover:bg-dark-700"
                }`}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 ${
                  service.highlight ? "bg-white/20" : "bg-primary/20"
                }`}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {loc.get(service, "title")}
                  {service.highlight && (
                    <span className="ms-2 text-xs bg-white/20 px-2 py-0.5 rounded">{t("newBadge")}</span>
                  )}
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${
                  service.highlight ? "text-white/80" : "text-dark-300"
                }`}
                  dangerouslySetInnerHTML={{ __html: loc.get(service, "description") }}
                />
                <span className="inline-flex items-center gap-1 text-white text-sm font-medium group-hover:gap-2 transition-all">
                  {t("learnMore")}
                  <ArrowRight size={14} className="rtl-flip" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
