import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧路径保留（owner 2026-10-12「方案 B：单一 SEO 中心」）
 * ==========================================================================
 * 后台 SEO 已收拢到 `/admin/seo/*`（中心页 + 子页）。本路径**永久保留为重定向**，
 * 旧书签、旧文档、脚本与其它页面的链接不会 404。
 * 实现在 `components/admin/seo/SeoSettingsPanel.tsx`，新入口 `/admin/seo/settings`。
 */
export default function LegacySeoSettingsRedirect() {
  redirect("/admin/seo/settings");
}
