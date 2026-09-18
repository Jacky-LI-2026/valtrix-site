"use client";

import Hero from "./Hero";
import WhoWeAre from "./WhoWeAre";
import Capabilities from "./Capabilities";
import ProductShowcase from "./ProductShowcase";
import Industries from "./Industries";
import NewsSection from "./NewsSection";
import CTASection from "./CTASection";

/**
 * UNILOK 精密工业风 — 首页组合容器（client component）
 * 区块顺序：Hero → WhoWeAre → Capabilities → ProductShowcase → Industries → News → CTA
 * 各区块内部自行处理数据加载状态。
 */
export default function UnilokHome() {
  return (
    <>
      <Hero />
      <WhoWeAre />
      <Capabilities />
      <ProductShowcase />
      <Industries />
      <NewsSection />
      <CTASection />
    </>
  );
}
