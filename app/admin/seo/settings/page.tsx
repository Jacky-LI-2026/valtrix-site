import SeoSettingsPanel from "@/components/admin/seo/SeoSettingsPanel";

export const dynamic = "force-dynamic";

/**
 * SEO / GEO 设置（原 `/admin/settings/seo`，2026-10-12 收拢到 `/admin/seo/settings`）
 * 实现体见 `components/admin/seo/SeoSettingsPanel.tsx`；旧路径保留永久重定向。
 */
export default function SeoSettingsPage() {
  return <SeoSettingsPanel />;
}
