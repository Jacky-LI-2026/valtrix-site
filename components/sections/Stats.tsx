"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  // 未触发动画时直接显示目标值（避免首屏出现 0+ 的尴尬空态）
  const [count, setCount] = useState(start ? 0 : target);

  useEffect(() => {
    if (!start) {
      // target 变化（如首页配置加载完成）时同步显示值，避免残留旧目标
      setCount(target);
      return;
    }
    setCount(0);
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration, start]);

  return count;
}

function StatItem({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const count = useCountUp(value, 2000, start);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        {count.toLocaleString()}
        <span className="text-primary">{suffix}</span>
      </div>
      <div className="text-dark-300 text-sm md:text-base">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { t, locale } = useI18n();
  const [start, setStart] = useState(false);
  const [homeConfig, setHomeConfig] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  const defaultStats = [
    { value: 10, suffix: "+", label: t("statsYears") },
    { value: 20, suffix: "+", label: t("statsPatents") },
    { value: 6, suffix: "", label: t("statsSeries") },
    { value: 20, suffix: "+", label: t("statsIndustries") },
  ];

  // 从API获取首页配置（统计数据等）
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/home-config", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setHomeConfig(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取首页配置失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStart(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // 从API数据构建统计数据，优先使用API数据（按当前 locale 取多语言标签）
  const stats: { value: number; suffix: string; label: string }[] = homeConfig?.stats && homeConfig.stats.length > 0
    ? homeConfig.stats.map((stat: any) => {
        const labelObj = stat.label;
        const label = labelObj && typeof labelObj === "object" ? (labelObj[locale] || labelObj.zh || "") : (labelObj || "");
        return {
          value: parseInt(String(stat.number ?? "")) || parseInt(String(stat.value ?? "")) || 0,
          suffix: stat.suffix || "",
          label,
        };
      })
    : defaultStats;

  return (
    <section ref={ref} className="tpl-section py-16 lg:py-20 bg-dark-900 relative overflow-hidden">
      {/* 装饰 */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, index) => (
            <StatItem key={index} {...stat} start={start} />
          ))}
        </div>
      </div>
    </section>
  );
}
