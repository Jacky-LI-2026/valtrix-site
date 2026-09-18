import { NextRequest, NextResponse } from 'next/server'
import { getBrandName } from '@/lib/brand'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const row = await prisma.siteConfig.findUnique({ where: { configKey: 'oem_config' } })
  const oem = (row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}) as any
  return NextResponse.json({
    ok: true,
    data: {
      brandName: oem.brandName || getBrandName(),
      adminTitle: oem.adminTitle || '后台管理系统',
      loginLogo: oem.loginLogo || '',
      loginSubtitle: oem.loginSubtitle || '',
      footerCopyright: oem.footerCopyright || '',
      frontendBrand: oem.frontendBrand || '',
      frontendCopyright: oem.frontendCopyright || '',
      icp: oem.icp || '',
      accentColor: oem.accentColor || '#CC0000',
      showLegal: oem.showLegal !== false,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const oem = {
    brandName: String(body.brandName ?? getBrandName()).slice(0, 60),
    adminTitle: String(body.adminTitle ?? '后台管理系统').slice(0, 60),
    loginLogo: String(body.loginLogo ?? '').slice(0, 500),
    loginSubtitle: String(body.loginSubtitle ?? '').slice(0, 200),
    footerCopyright: String(body.footerCopyright ?? '').slice(0, 200),
    frontendBrand: String(body.frontendBrand ?? '').slice(0, 60),
    frontendCopyright: String(body.frontendCopyright ?? '').slice(0, 200),
    icp: String(body.icp ?? '').slice(0, 200),
    accentColor: /^#[0-9a-fA-F]{3,8}$/.test(String(body.accentColor || '')) ? String(body.accentColor) : '#CC0000',
    showLegal: body.showLegal !== false,
  }
  await prisma.siteConfig.upsert({
    where: { configKey: 'oem_config' },
    update: { configValue: oem },
    create: { configKey: 'oem_config', configValue: oem, remark: '白标 OEM（品牌名/后台标题/登录页LOGO等）' },
  })
  return NextResponse.json({ ok: true, data: oem })
}
