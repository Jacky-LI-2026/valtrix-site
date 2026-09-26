/**
 * 后台**页面**权限表 —— **唯一真源**（阀门站）。
 *
 * 2026-09-17 从 `middleware.ts` 抽出（与基地同构）：此前该表只存在于 middleware 内联，
 * 而 `components/admin/AdminSidebar.tsx` 的动态插件卡片**无法判断自己该不该显示**
 * （没有 permission 字段）⇒ 会出现「入口可见、点进去 403」。
 * 现由中间件与侧边栏**共用本表**，避免两处各写一份（AGENTS §4.6）。
 *
 * ⚠️ 表内容是**阀门站原表 ∩ 基地表**的并集：阀门原有条目**一条未删、一条未改**（零放宽）。
 * ⚠️ 只增删条目即可，不要再在别处复制这张表。
 */
// ⚠️ 阀门站与基地的**有意差异**（2026-09-17）：
//   `/admin/email-marketing` 与 `/admin/visit-bookings` 在本站的门闩是 `lead:view`，
//   与本站**接口表**（`middleware.ts` 的 API_PERMISSION）保持一致 —— 否则会出现
//   「侧边栏可见、点进去 403」的空壳页（页面门闩与接口门闩**成对**是不变量）。
export const PATH_PERMISSION: [string, string][] = [
  ['/admin/products', 'product:view'],
  ['/admin/product-categories', 'product:view'],
  ['/admin/news', 'news:view'],
  ['/admin/resources', 'resource:view'],
  ['/admin/resource-categories', 'resource:view'],
  ['/admin/industries', 'industry:view'],
  ['/admin/services', 'service:view'],
  ['/admin/about', 'about:view'],
  ['/admin/careers', 'career:view'],
  ['/admin/menus', 'menu:view'],
  ['/admin/leads', 'lead:view'],
  ['/admin/download-leads', 'download-lead:view'],
  ['/admin/analytics', 'analytics:view'],
  ['/admin/settings/site', 'config:site'],
  ['/admin/settings/theme', 'config:theme'],
  ['/admin/settings/home', 'config:home'],
  ['/admin/settings/ai', 'ai:config'],
  ['/admin/settings/translate', 'translate-config:view'],
  ['/admin/settings/smtp', 'smtp:view'],
  ['/admin/settings/seo', 'seo:view'],
  ['/admin/templates', 'template:view'],
  ['/admin/collection', 'collect:manage'],
  ['/admin/auto-collection-tasks', 'auto-collection:view'],
  ['/admin/languages', 'language:view'],
  ['/admin/page-hero', 'page-hero:view'],
  ['/admin/backup', 'system:backup'],
  ['/admin/deploy', 'deploy:view'],
  ['/admin/system-update', 'system:update'],
  ['/admin/servers', 'deploy:view'],
  ['/admin/license', 'license:view'],
  ['/admin/users', 'system:user'],
  ['/admin/roles', 'system:role'],
  ['/admin/logs', 'system:log'],
  ['/admin/notifications', 'notification:view'],
  ['/admin/guide', 'guide:view'],
  ['/admin/plugins', 'config:site'],
  ['/admin/gateway', 'config:site'],
  ['/admin/content/products', 'product:view'],
  ['/admin/content/news', 'news:view'],
  ['/admin/content/services', 'service:view'],
  ['/admin/content/industries', 'industry:view'],
  ['/admin/shop/stats', 'analytics:view'],
  ['/admin/content-types', 'config:site'],
  ['/admin/quotes/template', 'config:site'],
  ['/admin/settings/oem', 'config:site'],
  ['/admin/visit-bookings', 'lead:view'],
  ['/admin/email-marketing', 'lead:view'],
  // 维护模式（2026-09-26，与左文站同步）：与 /api/admin/maintenance 同一权限码成对
  ['/admin/maintenance', 'config:site'],
  ['/admin/members', 'member:view'],
  ['/admin/member-levels', 'member-level:view'],
  ['/admin/shop/orders', 'order:view'],
  ['/admin/quotes', 'quote:view'],
  ['/admin/tickets', 'ticket:view'],
  ['/admin/content/case', 'case:view'],
  ['/admin/content/faq', 'faq:view'],
]
/** 按最长前缀匹配页面所需权限；无匹配返回 null（仅要求登录） */
export function requiredPathPermission(pathname: string): string | null {
  let required: string | null = null
  let bestLen = -1
  for (const [prefix, perm] of PATH_PERMISSION) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      bestLen = prefix.length
      required = perm
    }
  }
  return required
}
