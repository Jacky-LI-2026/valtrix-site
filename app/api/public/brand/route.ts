import { NextResponse } from 'next/server'
import { getBrandName } from '@/lib/brand'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** 公开品牌信息（白标 OEM）：登录页 / 侧边栏 / 页脚使用，无需登录 */
export async function GET() {
  try {
    let oem: any = {}
    const row = await prisma.siteConfig.findFirst({ where: { configKey: { in: ['oem_config', 'oem'] } } })
    if (row?.configValue && typeof row.configValue === 'object') {
      oem = row.configValue as any
    }
    return NextResponse.json({
      ok: true,
      brandName: oem.brandName || getBrandName(),
      adminTitle: oem.adminTitle || '后台管理系统',
      loginLogo: oem.loginLogo || '',
      loginSubtitle: oem.loginSubtitle || '',
      footerCopyright: oem.footerCopyright || '',
      accentColor: oem.accentColor || '#CC0000',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
