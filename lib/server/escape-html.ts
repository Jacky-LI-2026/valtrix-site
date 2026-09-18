/**
 * HTML 实体转义（用于邮件模板等场景，防止 XSS）
 * 将用户输入中的 &, <, >, ", ' 转为 HTML 实体
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
