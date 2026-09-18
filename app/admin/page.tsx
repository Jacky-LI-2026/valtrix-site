import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import {
  Package,
  Newspaper,
  Users,
  ShoppingCart,
  Activity,
  Clock,
  CheckCircle,
  ArrowRight,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  RefreshCw,
  CircleDot,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// 真实代码版本（package.json，与侧边栏/部署页一致；DB 系统版本表为空时兜底）
function getPkgVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export default async function AdminDashboard() {
  const session = await auth()
  const pkgVersion = getPkgVersion()
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  // 统计数据
  const [productCount, userCount, recentLogs, systemVersion, shopOrderCount, pendingOrderCount, memberCount, newsCount] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.operationLog.findMany({ take: 8, orderBy: { createdAt: 'desc' } }),
    prisma.systemVersion.findFirst({ where: { isCurrent: true } }),
    prisma.shopOrder.count(),
    prisma.shopOrder.count({ where: { status: 'pending' } }),
    prisma.member.count(),
    prisma.news.count(),
  ])

  const stats = [
    { label: '产品总数', value: productCount, icon: <Package size={20} />, tint: 'bg-red-50 text-[#CC0000]', href: '/admin/content/products' },
    { label: '商城订单', value: shopOrderCount, sub: `${pendingOrderCount} 单待确认`, icon: <ShoppingCart size={20} />, tint: 'bg-amber-50 text-amber-600', href: '/admin/shop/orders' },
    { label: '注册会员', value: memberCount, icon: <Users size={20} />, tint: 'bg-blue-50 text-blue-600', href: '/admin/members' },
    { label: '后台用户', value: userCount, icon: <ShieldCheck size={20} />, tint: 'bg-purple-50 text-purple-600', href: '/admin/users' },
  ]

  const quickLinks = [
    { label: '内容管理', desc: '产品 / 新闻 / 行业方案', href: '/admin/content/products', icon: <Package size={18} /> },
    { label: '商城订单', desc: '收款确认 / 发货登记', href: '/admin/shop/orders', icon: <ShoppingCart size={18} /> },
    { label: '用户权限', desc: '用户 / 角色 / 销售绑定', href: '/admin/users', icon: <ShieldCheck size={18} /> },
    { label: '站点设置', desc: '品牌 / SEO / 语种 / 首页', href: '/admin/settings/site', icon: <Settings size={18} /> },
    { label: '一键部署', desc: '打包上传 / 服务器管理', href: '/admin/deploy', icon: <RefreshCw size={18} /> },
    { label: '操作日志', desc: '后台操作审计记录', href: '/admin/logs', icon: <Activity size={18} /> },
  ]

  const logs = [
    { label: '产品管理', color: 'bg-red-100 text-red-600' },
    { label: '新闻管理', color: 'bg-blue-100 text-blue-600' },
    { label: '内容管理', color: 'bg-green-100 text-green-600' },
    { label: '系统', color: 'bg-gray-100 text-gray-600' },
    { label: '用户', color: 'bg-purple-100 text-purple-600' },
    { label: '商城', color: 'bg-amber-100 text-amber-600' },
  ]
  const logTint = (module: string) => {
    if (module.includes('产品')) return logs[0]
    if (module.includes('新闻')) return logs[1]
    if (module.includes('用户')) return logs[4]
    if (module.includes('商城') || module.includes('订单')) return logs[5]
    if (module.includes('内容')) return logs[2]
    return logs[3]
  }

  return (
    <div className="py-5">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">控制台</h1>
          <p className="mt-1 text-xs text-gray-400">{today} · 欢迎回来，{(session?.user as any)?.displayName || (session?.user as any)?.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
            <CircleDot className="h-3 w-3" /> 未接入自动检测
          </span>
          <span className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500">
            v{systemVersion?.version || pkgVersion}
          </span>
        </div>
      </div>

      {/* 统计卡（与商城订单页同风格：红竖条 + hover 提升） */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="admin-stat-card group relative overflow-hidden rounded border border-gray-200 bg-white px-4 py-3.5">
            <span className="absolute left-0 top-0 h-full w-0.5 bg-[#CC0000]" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] text-gray-400">{s.label}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{s.value}</div>
                {s.sub && <div className="mt-0.5 text-[10px] text-amber-600">{s.sub}</div>}
              </div>
              <div className={`rounded-lg p-2 ${s.tint}`}>{s.icon}</div>
            </div>
            <div className="mt-2 flex items-center gap-0.5 text-[10px] text-gray-300 transition-colors group-hover:text-[#CC0000]">
              进入管理 <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* 快捷入口 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href} className="group rounded border border-gray-200 bg-white p-3 transition-all hover:border-[#CC0000]/40 hover:shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-300 transition-colors group-hover:text-[#CC0000]">{l.icon}</span>
              <span className="text-[13px] font-medium">{l.label}</span>
            </div>
            <div className="mt-1 pl-6 text-[10px] text-gray-400">{l.desc}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 最近操作日志 */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Activity className="h-4 w-4 text-[#CC0000]" /> 最近操作
            </h2>
            <Link href="/admin/logs" className="text-xs text-gray-400 transition-colors hover:text-[#CC0000]">全部日志 →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-gray-400">
                <Clock className="h-7 w-7 text-gray-200" />
                <span className="text-sm">暂无操作记录</span>
              </div>
            ) : (
              recentLogs.map((log) => {
                const t = logTint(log.module)
                return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50/60">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${t.color}`}>{log.module}</span>
                      <span className="truncate text-[13px] text-gray-600">{log.action}{log.target ? ` · ${log.target}` : ""}</span>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-gray-400">{log.createdAt.toLocaleString('zh-CN')}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 系统状态 */}
        <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <LayoutDashboard className="h-4 w-4 text-[#CC0000]" /> 系统状态
            </h2>
            <span className="flex items-center gap-1 text-xs text-green-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" /> 未检测</span>
          </div>
          <div className="space-y-0.5 p-4">
            <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
              <div className="flex items-center gap-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-[13px] text-gray-700">数据库连接</span>
              </div>
              <span className="rounded bg-green-50 px-2 py-0.5 text-[11px] text-green-600">未检测</span>
            </div>
            <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
              <div className="flex items-center gap-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-[13px] text-gray-700">应用服务</span>
              </div>
              <span className="rounded bg-green-50 px-2 py-0.5 text-[11px] text-green-600">未检测</span>
            </div>
            <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
              <div className="flex items-center gap-3">
                <Activity size={16} className="text-blue-500" />
                <span className="text-[13px] text-gray-700">当前版本</span>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] tabular-nums text-blue-600">{systemVersion?.version || pkgVersion}</span>
            </div>
            <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-purple-500" />
                <span className="text-[13px] text-gray-700">当前用户</span>
              </div>
              <span className="text-[11px] text-gray-600">{(session?.user as any)?.displayName || (session?.user as any)?.username}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
              <div className="flex items-center gap-3">
                <Newspaper size={16} className="text-amber-500" />
                <span className="text-[13px] text-gray-700">新闻内容</span>
              </div>
              <span className="text-[11px] tabular-nums text-gray-600">{newsCount} 篇</span>
            </div>
            <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50/60 p-3 text-[11px] leading-relaxed text-gray-500">
              提示：后台已接入通用模型能力市场（AI 翻译 / AI 文本 / AI 图像 / 自动运营），
              前台支持六语种内容展示。商城订单支持销售绑定产品、自动分配、收款确认与发货登记。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
