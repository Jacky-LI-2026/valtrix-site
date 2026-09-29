/**
 * 富文本正文的**渲染期**小工具（不写库、不改数据）
 * ==========================================================================
 * 背景（owner 2026-09-29 报障：「段落首行空格在前端不显示」）：
 *   后台编辑器里作者是在段首敲了若干个**普通 ASCII 空格**（库里实测 6~7 个），
 *   而 HTML 规范会把**行首的连续空白折叠掉** ⇒ 前台段落永远顶格显示。
 *
 * 处理：把每个块级元素**开头**的纯空格串换成等量的 `&nbsp;`（不可折叠），
 *   前台所见即编辑器所见；只动「紧跟块级标签的纯空格」，其余内容**原样保留**。
 *
 * 刻意不处理的两种情况（避免引入新问题）：
 *   ① 段首空白里含**换行/制表符** —— 那类内容另有语义，交给浏览器按原样折叠；
 *   ② 段首已是 `&nbsp;`（\u00a0）—— 本来就不可折叠，无需再动。
 *
 * ⚠️ 只用于 `dangerouslySetInnerHTML` 的展示路径；后台编辑器读的仍是库里的原文，
 *   因此「保存一次就变味」的情况不会发生。
 */
const BLOCK_LEADING_SPACES_RE =
  /(<(?:p|div|li|h[1-6]|blockquote)\b[^>]*>)( +)/gi;

export function preserveLeadingSpaces(html?: string | null): string {
  if (!html) return "";
  return html.replace(BLOCK_LEADING_SPACES_RE, (_m, tag: string, ws: string) => tag + "&nbsp;".repeat(ws.length));
}

export default preserveLeadingSpaces;
