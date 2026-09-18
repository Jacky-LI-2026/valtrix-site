/**
 * 站点对外基础地址（单一来源）
 * =====================================================
 * 用于 canonical / OpenGraph / JSON-LD / 邮件链接 等一切需要「本站域名」的地方。
 *
 * 背景（双 fork 合并 D1 = 单码多库）：
 *   基地同一份代码要服务多个**独立部署**（各自独立数据库、独立 .env），
 *   每站域名不同 —— 因此**绝不能在代码里硬编码域名**，一律读部署级环境变量：
 *
 *     NEXT_PUBLIC_SITE_URL="https://www.example.com"
 *
 * 解析优先级：
 *   1) NEXT_PUBLIC_SITE_URL  ← 部署时按站点配置（推荐，也是唯一正确的做法）
 *   2) NEXTAUTH_URL          ← 多数部署已配置，作为兼容回退
 *   3) http://localhost:3000 ← 仅本地开发兜底
 *
 * ⚠️ 注意：NEXT_PUBLIC_* 会在**构建期**被内联进客户端产物，所以改它需要重新构建；
 *    NEXTAUTH_URL 只在服务端可读。本模块以服务端使用为主。
 */
const FALLBACK = "http://localhost:3000";

/** 取站点基础地址（已去除结尾斜杠）。 */
export function getSiteBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    FALLBACK;
  return String(raw).trim().replace(/\/+$/, "");
}

/** 拼接站点内绝对地址：siteUrl("/news") → https://host/news */
export function siteUrl(path?: string | null): string {
  const base = getSiteBaseUrl();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}
