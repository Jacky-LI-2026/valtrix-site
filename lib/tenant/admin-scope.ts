/**
 * 后台站点视角（Admin Site Scope）
 * =====================================================
 * R4 深化：后台可通过「站点切换」选择当前管理站点（存 cookie: admin_site_id）。
 * - 未设置（null）→ 管理「全局 + 全部站点」内容（默认，兼容现有后台）。
 * - 设置某站点 → 列表只显示「全局共享 + 该站点」内容，新建内容自动归属该站点。
 */
import { cookies } from 'next/headers'
import { buildAdminSiteWhere } from './scope'

export const ADMIN_SITE_COOKIE = 'admin_site_id'

/** 读取当前后台管理站点 id（无 cookie / 非法 → null = 全局视角） */
export function getAdminSiteId(): bigint | null {
  try {
    const c = cookies().get(ADMIN_SITE_COOKIE)
    if (!c?.value) return null
    const n = Number(c.value)
    if (Number.isNaN(n) || n <= 0) return null
    return BigInt(n)
  } catch {
    return null
  }
}

/**
 * 生成后台列表过滤条件。
 * 视角为 null（全局）→ 返回 {}（不过滤，看到全部内容，兼容存量）；
 * 视角为某站点 → 返回「全局共享 + 该站点」过滤。
 */
export function adminListFilter(): Record<string, any> {
  return buildAdminSiteWhere(getAdminSiteId())
}

/**
 * 生成新建内容的 siteId 归属。
 * 视角为某站点 → 归属该站点；全局视角 → null（全局共享）。
 */
export function adminCreateSiteId(): bigint | null {
  return getAdminSiteId()
}

/** 供服务端组件读取当前视角 id（数字字符串，便于展示） */
export function adminSiteIdString(): string {
  const id = getAdminSiteId()
  return id ? String(id) : ''
}
