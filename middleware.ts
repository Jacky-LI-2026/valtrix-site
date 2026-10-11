import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { requiredPathPermission } from '@/lib/admin-path-permissions'

// 路由 -> 所需权限（最长前缀匹配）。未列出的 /admin 路径不校验（控制台等）。
// 页面权限表已抽到 @/lib/admin-path-permissions（与后台侧边栏共用，避免两处各写一份）。
// ⚠️ 原内联表已整体迁入该模块（内容为并集，原有条目一条未改）—— 不要再在这里写第二份。

const FORBIDDEN_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>无权限访问</title></head><body style="margin:0;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#f4f3ee;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)"><div style="font-size:44px;margin-bottom:12px">🔒</div><h1 style="margin:0 0 8px;font-size:20px;color:#1a1b1c">无权限访问</h1><p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">当前账号没有访问该栏目的权限，请联系管理员为你的角色分配对应权限。</p><a href="/admin" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 28px;border-radius:8px;text-decoration:none;font-size:14px">返回控制台</a></div></body></html>`

/**
 * API 路径 -> 所需权限（最长前缀匹配）。
 * =====================================================
 * 背景：middleware 此前只覆盖 /admin 页面，后台 API 路由完全不在 matcher 内，
 * 导致任何已登录的低权限账号（如 editor）可直接调用「用户管理」「一键部署」「授权管理」
 * 等接口，绕过页面级权限校验。
 *
 * 设计不变量：「页面可见 ⇒ 对应 API 可调用」，故 API 与页面使用同一套权限码。
 *
 * ⚠️ 仅可使用数据库中真实存在的权限码（来源：prisma/seed.ts + scripts/seed-permissions.js
 *    + scripts/_archive/_init_new_perms.js）。使用不存在的权限码会让包括 admin 在内的
 *    所有人被拒（权限来自 DB 行，admin 也只有 DB 里有的那些）——下方 admin 角色兜底即为
 *    此风险的安全网。
 *
 * 未列出的 /api/admin 路径仅要求登录（保持既有行为，待后续按模块逐步收口）。
 */
const API_PERMISSION: [string, string][] = [
  // ===== 系统与安全 =====
  ['/api/admin/users', 'system:user'],
  // 维护模式（2026-09-26，与左文站同步）：前台 503 开关 → 站点配置权限
  ['/api/admin/maintenance', 'config:site'],
  ['/api/admin/roles', 'system:role'],
  ['/api/admin/logs', 'system:log'],
  ['/api/admin/backup', 'system:backup'],
  ['/api/admin/system-update', 'system:update'],
  ['/api/admin/update', 'system:update'],
  ['/api/admin/deploy', 'deploy:view'],
  ['/api/admin/servers', 'deploy:view'],
  ['/api/admin/license', 'license:view'],
  // ===== 插件 / 多租户 / 站点 =====
  ['/api/admin/plugins', 'config:site'],
  ['/api/admin/plugin-market', 'config:site'],
  ['/api/admin/gateway', 'config:site'],
  // 社媒一键发布（2026-10-01，与左文站同步）：与页面 /admin/social-publish 同码成对
  ['/api/admin/social-publish', 'social-publish:config'],
  ['/api/admin/tenants', 'config:site'],
  ['/api/admin/sites', 'config:site'],
  ['/api/admin/industry-packs', 'config:site'],
  ['/api/admin/applet', 'config:site'],
  // ===== 站点配置 =====
  ['/api/admin/settings/ai', 'ai:config'],
  ['/api/admin/settings/smtp', 'smtp:view'],
  ['/api/admin/settings/seo', 'seo:view'],
  ['/api/admin/settings/languages', 'language:view'],
  ['/api/admin/settings/oem', 'config:site'],
  ['/api/admin/settings/pricing', 'config:site'],
  ['/api/admin/settings/company-verify', 'config:site'],
  ['/api/admin/site-config', 'config:site'],
  ['/api/admin/pricing', 'config:site'],
  ['/api/admin/customer-types', 'config:site'],
  ['/api/admin/theme', 'config:theme'],
  ['/api/admin/home-config', 'config:home'],
  ['/api/admin/home-sections', 'config:home'],
  ['/api/admin/page-config', 'page-hero:view'],
  ['/api/admin/page-hero', 'page-hero:view'],
  ['/api/admin/languages', 'language:view'],
  ['/api/admin/templates', 'template:view'],
  // ===== 内容模块 =====
  ['/api/admin/products', 'product:view'],
  ['/api/admin/product-tabs', 'product:view'],
  ['/api/admin/product-categories', 'product:view'],
  // 🔒 商城收口（2026-09-15 新增）：此前 `/api/admin/shop/*` **完全没有权限条目**，
  //    而 shop 的 `[id]` 写接口（products/categories/coupons）文件内**连 auth() 都没有**
  //    ⇒ 按本文件顶部口径「未列出的 /api/admin 路径仅要求登录」，任意最低权限账号
  //      即可改删商城商品、分类与优惠券。
  //    ⚠️ 权限码必须复用**库中真实存在**的码（见本表头注：写不存在的码会把所有人拒掉）。
  //      商品/分类复用内容模块的 `product:view`；优惠券属营销/价格配置，与
  //      既有的 `/api/admin/pricing → config:site` 同源口径。
  ['/api/admin/shop/products', 'product:view'],
  ['/api/admin/shop/categories', 'product:view'],
  ['/api/admin/shop/coupons', 'config:site'],
  ['/api/admin/resources', 'resource:view'],
  ['/api/admin/resource-categories', 'resource:view'],
  ['/api/admin/careers', 'career:view'],
  ['/api/admin/about', 'about:view'],
  ['/api/admin/menus', 'menu:view'],
  // ===== 线索与统计 =====
  ['/api/admin/leads', 'lead:view'],
  ['/api/admin/contact', 'lead:view'],
  ['/api/admin/download-leads', 'download-lead:view'],
  ['/api/admin/forms', 'config:site'],
  ['/api/admin/email-marketing', 'lead:view'],
  ['/api/admin/visit-bookings', 'lead:view'],
  ['/api/admin/analytics', 'analytics:view'],
  ['/api/admin/funnel', 'analytics:view'],
  ['/api/admin/heatmap', 'analytics:view'],
  ['/api/admin/operations', 'analytics:view'],
  // ===== SEO / 采集 / AI / 翻译 =====
  ['/api/admin/seo', 'seo:view'],
  ['/api/admin/backlinks', 'seo:view'],
  ['/api/admin/collection', 'collect:manage'],
  ['/api/admin/auto-collection-tasks', 'auto-collection:view'],
  ['/api/admin/ai', 'ai:config'],
  // 注意：/api/admin/translate 与 /api/admin/batch-translate 是内容表单里
  // AutoTranslateBar / MultiLangTextField 的翻译工具，**编辑者日常使用**，
  // 故意不在此收口（仅要求登录）。只收口翻译「设置」接口。
  ['/api/admin/translate-config', 'translate-config:view'],
  ['/api/admin/guide', 'guide:view'],

  // ===== 2026-09-17 自基地同步的权限收口条目（阀门原有条目一条未改、一条未删）=====
  ['/api/admin/content/products', 'product:view'],
  ['/api/admin/content/news', 'news:view'],
  ['/api/admin/content/services', 'service:view'],
  ['/api/admin/content/industries', 'industry:view'],
  ['/api/admin/shop/stats', 'analytics:view'],
  ['/api/admin/shop/orders/candidates', 'system:user'],
  ['/api/admin/content-types', 'config:site'],
  ['/api/admin/quotes/template', 'config:site'],
  ['/api/admin/oem', 'config:site'],
  ['/api/admin/members', 'member:view'],
  ['/api/admin/member-levels', 'member-level:view'],
  ['/api/admin/shop/orders', 'order:view'],
  ['/api/admin/quotes', 'quote:view'],
  ['/api/admin/tickets', 'ticket:view'],
  ['/api/admin/content/case', 'case:view'],
  ['/api/admin/content/faq', 'faq:view'],
  ['/api/admin/notifications', 'notification:view'],
  ['/api/admin/upload', 'file:upload'],
  ['/api/admin/translate', 'translate:use'],
  ['/api/admin/batch-translate', 'translate:use'],
  ['/api/admin/content', 'content:view'],
]

/**
 * 对所有已登录后台用户开放的 API（不参与 API_PERMISSION 校验）。
 * =====================================================
 * 判定依据：**全局 UI 组件/内容编辑流程依赖**，与「该功能的设置页权限」无关。
 *
 * - /api/admin/version         ：侧边栏底部版本号（所有后台页面）
 * - /api/admin/site-scope      ：站点视角切换器（读当前值 / 写 cookie，仅影响自身列表过滤）
 * - /api/admin/ai-image        ：AI 配图按钮嵌在 ContentTypeForm 中，所有内容编辑者都会用到
 * - /api/admin/languages (GET) ：多语言字段组件需读取启用语种列表（所有内容编辑者）
 * - /api/admin/plugins?mode=enabled (GET)：侧边栏插件菜单元数据（仅 key/名称/入口，不含密钥）
 * - /api/admin/system-health  ：控制台「系统自检」徽标/卡片（仪表盘是所有后台角色都看的页面；
 *                               只返回健康状态 —— 数据库往返、应用服务、版本、授权是否到期，
 *                               **不含密钥，也不含授权客户编号与绑定域名**）
 *
 * ⚠️ 不在此列的敏感读接口必须保持权限校验，例如 /api/admin/site-config：
 *    其 GET 返回 site_config **全表**（含 smtp_config 密码、plugin_api_keys 等密钥）。
 */
function isOpenAdminApi(request: NextRequest, pathname: string): boolean {
  // 始终开放（仅 GET 语义的轻量接口；site-scope 另有 POST 用于切换视角 cookie）
  if (pathname === '/api/admin/version') return true
  if (pathname === '/api/admin/site-scope') return true

  // 内容创作工具（编辑者的本职工作，非提权面）
  if (pathname.startsWith('/api/admin/ai-image')) return true

  const isRead = request.method === 'GET' || request.method === 'HEAD'
  if (!isRead) return false

  // 启用语种列表：MultiLangFieldV2 / AutoTranslateBar 等组件在所有内容表单中使用
  if (pathname === '/api/admin/languages') return true

  // 控制台「系统自检」（见上方白名单说明）：所有后台角色的仪表盘都在用
  if (pathname === '/api/admin/system-health') return true

  // 侧边栏插件菜单元数据（**不含密钥**；不带 mode 的 GET 会返回插件 config，故必须保持校验）
  if (
    pathname === '/api/admin/plugins' &&
    request.nextUrl.searchParams.get('mode') === 'enabled'
  ) {
    return true
  }

  return false
}

/** 在「路径 → 权限」表中按最长前缀匹配所需权限；无匹配返回 null（仅要求登录） */
function requiredApiPermission(pathname: string): string | null {
  let required: string | null = null
  let bestLen = -1
  for (const [prefix, perm] of API_PERMISSION) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      bestLen = prefix.length
      required = perm
    }
  }
  return required
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 前台页面（非 admin/api/uploads）：仅转发模板预览/微调参数（?__template=xxx&__primary=...）供 RootLayout 读取，
  // 其余直接放行（不执行后台鉴权，避免无谓开销）
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/uploads')
  ) {
    // ---- 真实请求路径（服务端 SEO canonical / hreflang 依赖它）----
    // 为什么用请求头而不是在每个 layout 里写死 path：layout 的 metadata 会被**子路由继承**，
    // 写死会让 `/products/<tab>/<id>` 继承到 canonical=/products（详情页被声明成列表页重复内容）。
    // 见 lib/seo-metadata.ts 的 resolvePagePath。
    // ⚠️ 必须**无条件剥离**外部传入的同名头再重设，否则可被伪造（与 x-preview-template 同理）。
    const h = new Headers(request.headers)
    h.delete('x-pathname')
    h.set('x-pathname', pathname)

    if (request.nextUrl.searchParams.has('__template')) {
      h.set('x-preview-template', request.nextUrl.searchParams.get('__template') || '')
      // 微调参数：__primary/__radius/__spacing/__fontScale/__shadow 等 → JSON header
      const tune: Record<string, string> = {}
      for (const [k, v] of Array.from(request.nextUrl.searchParams.entries())) {
        if (k.startsWith('__') && k !== '__template' && v) tune[k.slice(2)] = v
      }
      if (Object.keys(tune).length > 0) {
        h.set('x-preview-tune', JSON.stringify(tune))
      }
    }
    return NextResponse.next({ request: { headers: h } })
  }

  // 上传的图片/文件：7 天浏览器缓存（配合 ETag 协商缓存，切换语种/刷新秒显示）
  if (pathname.startsWith('/uploads/')) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'public, max-age=604800')
    return res
  }

  // 登录页、初始化页、API 路由、静态资源公开
  if (
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/setup') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico'
  ) {
    // 已登录用户访问登录/初始化页 → 重定向控制台（避免登录表单叠加侧边栏）
    if (pathname.startsWith('/admin/login') || pathname.startsWith('/admin/setup')) {
      const sess = await auth()
      if (sess?.user) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return NextResponse.next()
  }

  // ===== 后台 API（/api/admin/**）=====
  // 与页面不同：未登录/无权限必须返回 JSON 状态码，不能 302 重定向到登录页
  // （否则前端 fetch 会拿到登录页 HTML 并误判为成功）。
  if (pathname.startsWith('/api/admin')) {
    // 初始化接口公开：首次部署数据库无账号时用于创建首个管理员
    // （与 auth.ts authorized 回调放行 /api/admin/setup 保持一致）
    if (pathname.startsWith('/api/admin/setup')) return NextResponse.next()

    const apiSession = await auth()
    if (!apiSession?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 仅登录即可访问的全局只读/创作工具接口
    if (isOpenAdminApi(request, pathname)) return NextResponse.next()

    // 超管兜底：admin 角色在 DB 中拥有全部权限行（seed.ts / seed-permissions.js 授予）。
    // 兜底可避免「引用了 DB 中不存在的权限码」时连管理员一起被拒——
    // 本项目确实出现过这类不存在码（如 AdminSidebar 曾用的 plugin:view）。
    const apiRoles: string[] = (apiSession.user as any)?.roles || []
    if (apiRoles.includes('admin')) return NextResponse.next()

    const apiUserPerms: string[] = (apiSession.user as any)?.permissions || []
    const apiRequired = requiredApiPermission(pathname)
    if (apiRequired && !apiUserPerms.includes(apiRequired)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    return NextResponse.next()
  }

  // 其他 /admin 路径需要登录
  const session = await auth()
  if (!session?.user) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 页面级权限校验（按最长前缀匹配）
  // 超管兜底：与 API 分支同源，避免不存在的权限码把管理员一起挡住
  const userRoles: string[] = (session.user as any)?.roles || []
  const userPerms: string[] = (session.user as any)?.permissions || []
  // 2026-09-17：原实现在此处**直接遍历内联 PATH_PERMISSION 表**；该表已抽到
  // `@/lib/admin-path-permissions`（与侧边栏共用同一份，避免两处各写一份）。
  // ⇒ 改为调用同名 helper（语义完全一致：**最长前缀优先**，无匹配返回 null）。
  const required: string | null = requiredPathPermission(pathname)
  if (required && !userPerms.includes(required) && !userRoles.includes('admin')) {
    return new NextResponse(FORBIDDEN_HTML, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/uploads/:path*', '/((?!_next|api|favicon.ico).*)'],
}
