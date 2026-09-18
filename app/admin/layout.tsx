import { auth } from '@/auth'
import { headers } from 'next/headers'
import Link from 'next/link'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import PluginBackBar from '@/components/admin/PluginBackBar'
import { readLicense } from '@/lib/license/store'
import { verifyLicenseCode, isExpired, isDomainAllowed } from '@/lib/license/verify'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // 登录页无侧边栏布局
  if (!session?.user) {
    return <>{children}</>
  }

  // 商用授权状态检测（未授权/过期/域名不匹配时显示横幅提醒，不锁死功能）
  let licenseWarn: string | null = null
  try {
    const host = headers().get('host') || 'localhost'
    const record = readLicense()
    if (!record) {
      licenseWarn = '本系统未激活商用授权，后台功能不受影响，但请尽快联系授权方激活。'
    } else {
      const v = verifyLicenseCode(record.code)
      if (!v.ok || !v.payload) {
        licenseWarn = '本地授权数据无效，请前往「授权管理」重新激活。'
      } else if (isExpired(v.payload)) {
        licenseWarn = '商用授权已过期，请前往「授权管理」更新授权码。'
      } else if (!isDomainAllowed(v.payload, host)) {
        licenseWarn = `当前站点域名（${host}）不在授权范围内，请联系授权方更换授权码。`
      }
    }
  } catch {}

  return (
    <div className="admin-shell h-screen bg-gray-50 flex overflow-hidden">
      <AdminSidebar user={session.user as any} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminHeader user={session.user as any} />
        {licenseWarn && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-sm text-amber-800">
            <span>⚠️ {licenseWarn}</span>
            <Link href="/admin/license" className="text-amber-700 underline hover:text-amber-900 shrink-0 ml-4">
              前往授权管理 →
            </Link>
          </div>
        )}
        <main className="flex-1 p-6 overflow-y-auto admin-scroll">
          <PluginBackBar />
          {children}
        </main>
      </div>
    </div>
  )
}
