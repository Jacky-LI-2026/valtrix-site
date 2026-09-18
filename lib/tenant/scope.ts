/**
 * 站点作用域（Site Scope）
 * =====================================================
 * R4 深化：业务数据按站点（siteId）隔离。
 * - 存量数据 siteId=null 视为「全局共享」（所有站点可见，兼容历史数据）。
 * - 前台查询统一走 buildSiteWhere(ctx) 生成过滤条件，实现「全局 + 本站」可见。
 * - 后台新建内容时调用 currentSiteId(headers) 写入当前解析站点（无则 null=全局）。
 */
import { getTenantContext } from "./context";

/** 生成前台查询过滤：本站内容 + 全局共享内容 */
export function buildSiteWhere(siteId: bigint | number | null | undefined): Record<string, any> {
  if (siteId == null) return {};
  const sid = typeof siteId === "number" ? BigInt(siteId) : siteId;
  return {
    OR: [{ siteId: null }, { siteId: sid }],
  };
}

/** 生成后台归属过滤（仅本站内容；管理端默认看全局+本站） */
export function buildAdminSiteWhere(siteId: bigint | number | null | undefined): Record<string, any> {
  if (!siteId) return {};
  const sid = typeof siteId === "number" ? BigInt(siteId) : siteId;
  return { OR: [{ siteId: null }, { siteId: sid }] };
}

/**
 * 从请求头解析当前站点 id（无 Host / 未匹配站点时回退默认站点 id）。
 * 供后台新建内容时注入 siteId。
 */
export async function currentSiteId(
  headers: Headers | Record<string, string | string[] | null | undefined> = {}
): Promise<bigint | null> {
  try {
    const ctx = await getTenantContext(headers);
    return typeof ctx.siteId === "number" ? BigInt(ctx.siteId) : ctx.siteId;
  } catch {
    return null;
  }
}

/** 便捷：任意对象追加 siteId（若未显式指定） */
export function withSiteId<T extends Record<string, any>>(data: T, siteId: bigint | null | undefined): T {
  if (siteId === null || siteId === undefined) return data;
  if (data.siteId !== undefined && data.siteId !== null) return data; // 已有显式值不覆盖
  return { ...data, siteId };
}
