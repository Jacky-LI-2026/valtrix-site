import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const DEFAULT_CONFIG = {
  appName: '',
  appId: '',            // 微信小程序 AppID
  themeColor: '#CC0000',
  enabled: false,
  platform: 'weapp',    // weapp 微信小程序 / h5 H5 App
  appDesc: '',
  generatedAt: '',
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const row = await prisma.siteConfig.findUnique({ where: { configKey: 'applet_config' } })
  const cfg = (row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}) as any
  return NextResponse.json({ ok: true, data: { ...DEFAULT_CONFIG, ...cfg } })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const clean: Record<string, any> = {}
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    if (body[k] !== undefined) clean[k] = body[k]
  }
  await prisma.siteConfig.upsert({
    where: { configKey: 'applet_config' },
    update: { configValue: clean as any },
    create: { configKey: 'applet_config', configValue: clean as any },
  })
  return NextResponse.json({ ok: true })
}
