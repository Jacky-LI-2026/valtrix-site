import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductSelector from "@/components/product-selector/ProductSelector";
import { isPluginEnabled } from "@/lib/plugins/store";
import { getBrandInfo } from "@/lib/server/brand";

/**
 * 前台「产品快速选型」页（插件 product-selector 的落地页）
 * ==========================================================================
 * owner 2026-10-06：按产品手册 html 原型风格做的选型器，结果与**产品中心**同一棵树
 * （点结果卡片就是产品详情页，可加入询价车）。
 *
 * 🔴 owner 2026-10-08：「**这些都是阀门网站独有功能**」——
 *   本页是阀门站（VALTRIX）独有的选型器，因此：
 *     ① **插件停用 ⇒ 直达该 URL 也 404**（此前是"入口按钮隐藏、页面仍可直达"，
 *        左文科技站会被访问到/被搜索引擎收录到**阀门产品目录**）；
 *     ② 标题/描述**不得写死品牌名**（G2）—— 品牌名按站点（DB → env）生成。
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  /**
   * 插件停用的站点（非阀门站）不产出任何选型器元信息 ——
   * 返回空对象，让站点自己的 404 页（`app/not-found.tsx`）去决定标题与描述，
   * 避免这里硬造一个与站点口径不一致的标题。
   */
  if (!(await isPluginEnabled("product-selector"))) return {};
  const brand = await getBrandInfo();
  const brandName = brand.nameEn || brand.name;
  return {
    title: "产品快速选型 · Product Quick Selector",
    description: `按类别与参数快速筛选产品，直接给出可询价的型号与规格 — ${brandName} 产品选型工具。`,
    alternates: { canonical: "/products/selector" },
  };
}

export default async function SelectorPage() {
  /**
   * 插件停用 ⇒ 真 404（**不渲染**阀门产品目录）。
   * ⚠️ 必须在渲染前判定：`isPluginEnabled` 读 DB（`site_config.plugin_state`），
   *    本页已是 `force-dynamic`，不存在构建期快照问题。
   */
  if (!(await isPluginEnabled("product-selector"))) notFound();
  return <ProductSelector />;
}
