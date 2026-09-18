import { redirect } from "next/navigation";

/**
 * 前台组件市场 · 后台页（已合并）
 * 首页各区块的显示启停 + 排序已合并到「首页配置」（/admin/settings/home）。
 * 本页保留为重定向，避免外部链接 404。
 */
export default function HomeSectionsPage() {
  redirect("/admin/settings/home");
}
