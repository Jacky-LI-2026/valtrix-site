"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UnilokHeader from "@/components/theme-unilok/Header";
import UnilokFooter from "@/components/theme-unilok/Footer";
import KitzHeader from "@/components/theme-kitzsct/Header";
import KitzFooter from "@/components/theme-kitzsct/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import SeoAlternates from "@/components/seo/SeoAlternates";
import AiChatWidget from "@/components/chat/AiChatWidget";
import FloatBookingButton from "@/components/chat/FloatBookingButton";
import FloatQuoteCartButton from "@/components/chat/FloatQuoteCartButton";
import FloatShopCartButton from "@/components/shop/FloatShopCartButton";
import { useActiveTemplate } from "@/lib/templates/active-theme";

/**
 * 前台外壳（页头/页脚/浮层）
 * =====================================================
 * 双 fork 合并 D3（2026-09-12）：从阀门站回流 UNILOK 模板的页头页脚切换。
 * 按 <html data-template> 判定：unilok → UnilokHeader/UnilokFooter；其余 → 默认 Header/Footer。
 * 洁净科技风（kitz-clean）追加：kitz → KitzHeader/KitzFooter（三分支，2026-09 新增主题）。
 *
 * ⚠️ 注意：阀门站版本同时把右侧浮动按钮组改成了「垂直堆叠（bottom-20 right-4 flex-col）」，
 *    那属于阀门站的版式调整，**基地保持原有横向排布不变**（ADR-005 前台版式零改动）。
 */
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isUnilok, isKitz } = useActiveTemplate();

  // 后台页面不显示前台页头页脚
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SeoAlternates />
      <AnalyticsTracker />
      <AiChatWidget />
      {/* 右侧浮动按钮组：预约参观 + 询价车 + 商城购物车（flex 自动排布，不与 AI 客服重叠） */}
      {/* print-hidden：打印时隐藏整组悬浮交互件（询价车/购物车/预约），见 globals.css 的打印样式 */}
      <div className="print-hidden fixed bottom-5 right-24 z-[90] flex items-center gap-3">
        <FloatBookingButton />
        <FloatQuoteCartButton />
        <FloatShopCartButton />
      </div>
      {isKitz ? <KitzHeader /> : isUnilok ? <UnilokHeader /> : <Header />}
      <main className="flex-1">{children}</main>
      {isKitz ? <KitzFooter /> : isUnilok ? <UnilokFooter /> : <Footer />}
    </>
  );
}
