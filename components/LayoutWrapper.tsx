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
      {/* 右侧浮动按钮组：预约参观 + 询价车 + 商城购物车，垂直堆叠在 AI 客服圆球上方（避免横向占宽） */}
      <div className="fixed bottom-20 right-4 z-[90] flex flex-col items-end gap-2">
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
