import SeoAuditPanel from "@/components/admin/seo/SeoAuditPanel";

export const dynamic = "force-dynamic";

/**
 * 内容 SEO 批量补全（原 `/admin/seo-audit`，2026-10-12 收拢到 `/admin/seo/audit`）
 * 实现体见 `components/admin/seo/SeoAuditPanel.tsx`；旧路径保留永久重定向。
 */
export default function SeoAuditPage() {
  return <SeoAuditPanel />;
}
