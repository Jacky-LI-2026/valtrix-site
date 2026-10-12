import BacklinkPostsPanel from "@/components/admin/seo/BacklinkPostsPanel";

export const dynamic = "force-dynamic";

/**
 * 软文营销（原 `/admin/backlinks/posts`，2026-10-12 收拢到 `/admin/seo/backlinks/posts`）
 * 实现体见 `components/admin/seo/BacklinkPostsPanel.tsx`；旧路径保留永久重定向。
 */
export default function SeoBacklinkPostsPage() {
  return <BacklinkPostsPanel />;
}
