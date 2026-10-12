import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧路径保留（owner 2026-10-12「方案 B：单一 SEO 中心」）
 * 内容 SEO 批量补全已迁到 `/admin/seo/audit`；本路径永久保留为重定向。
 */
export default function LegacySeoAuditRedirect() {
  redirect("/admin/seo/audit");
}
