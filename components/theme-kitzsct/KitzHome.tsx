"use client";

import KitzHero from "./Hero";
import KitzProductSearch from "./ProductSearch";
import KitzDownloads from "./Downloads";
import KitzValueProps from "./ValueProps";
import KitzCapabilities from "./Capabilities";
import KitzProductShowcase from "./ProductShowcase";
import KitzIndustries from "./Industries";
import KitzNewsSection from "./NewsSection";
import KitzCTASection from "./CTASection";

/**
 * KITZ SCT 日式工业风 — 首页组合容器（client component）
 *
 * 区块顺序（与主会话给定的契约逐字一致）：
 *   Hero → ProductSearch → Downloads → ValueProps → Capabilities
 *   → ProductShowcase → Industries → NewsSection → CTASection
 *
 * 为什么容器只做组合、不取数：每个区块各自负责自己的数据与加载态，
 * 这样任一区块的接口挂掉不会拖垮整屏，也便于按块替换/下线。
 * Header / Footer 由模板派发层负责，不在此容器内（与 UNILOK 的 UnilokHome 同构）。
 */
export default function KitzHome() {
  return (
    <>
      <KitzHero />
      <KitzProductSearch />
      <KitzDownloads />
      <KitzValueProps />
      <KitzCapabilities />
      <KitzProductShowcase />
      <KitzIndustries />
      <KitzNewsSection />
      <KitzCTASection />
    </>
  );
}
