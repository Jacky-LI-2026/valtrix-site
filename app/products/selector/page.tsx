import type { Metadata } from "next";
import ProductSelector from "@/components/product-selector/ProductSelector";

/**
 * 前台「产品快速选型」页（插件 product-selector 的落地页）
 * ==========================================================================
 * owner 2026-10-06：按产品手册 html 原型风格做的选型器，结果与**产品中心**同一棵树
 * （点结果卡片就是产品详情页，可加入询价车）。
 *
 * 说明：页面本身是公开页；插件是否启用由管理端控制（停用时入口按钮隐藏）。
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "产品快速选型 · Product Quick Selector",
    description: "按类别与参数快速筛选产品，直接给出可询价的型号与规格 — VALTRIX 高纯流体控制产品选型工具。",
    alternates: { canonical: "/products/selector" },
  };
}

export default function SelectorPage() {
  return <ProductSelector />;
}
