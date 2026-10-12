import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧路径保留（owner 2026-10-12「方案 B：单一 SEO 中心」）
 * 外链台账已迁到 `/admin/seo/backlinks`；本路径永久保留为重定向
 * （插件注册表里的 adminUrls 也已同步到新路径）。
 */
export default function LegacyBacklinksRedirect() {
  redirect("/admin/seo/backlinks");
}
