import BacklinksPanel from "@/components/admin/seo/BacklinksPanel";

export const dynamic = "force-dynamic";

/**
 * 外链台账（原 `/admin/backlinks`，2026-10-12 收拢到 `/admin/seo/backlinks`）
 * 实现体见 `components/admin/seo/BacklinksPanel.tsx`；旧路径保留永久重定向。
 */
export default function SeoBacklinksPage() {
  return <BacklinksPanel />;
}
