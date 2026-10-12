import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧路径保留（owner 2026-10-12「方案 B：单一 SEO 中心」）
 * 软文营销已迁到 `/admin/seo/backlinks/posts`；本路径永久保留为重定向。
 */
export default function LegacyBacklinkPostsRedirect() {
  redirect("/admin/seo/backlinks/posts");
}
