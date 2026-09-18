import { NextRequest, NextResponse } from 'next/server'
import { listLocalPacks, installPack, uninstallPack, getInstallRecords } from '@/lib/server/pack-manager'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/industry-packs —— 本地行业包 + 安装记录 + 站点列表
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const packs = listLocalPacks()
    const records = await getInstallRecords()
    const sites = await prisma.site.findMany({
      select: { id: true, name: true, domain: true, isDefault: true, industryPack: true, industryPackVersion: true },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json({
      packs,
      records,
      sites: sites.map(s => ({
        id: String(s.id), name: s.name, domain: s.domain, isDefault: s.isDefault,
        industryPack: s.industryPack, industryPackVersion: s.industryPackVersion,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/admin/industry-packs —— { action: 'install'|'uninstall', packKey, siteId }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
    const { action, packKey, siteId } = body || {}
    if (!action || !packKey || !siteId) {
      return NextResponse.json({ error: '缺少参数 action/packKey/siteId' }, { status: 400 })
    }
    const id = BigInt(String(siteId))
    if (action === 'install') {
      // packDir 从本地包列表解析（只允许安装本地存在的包）
      const packs = listLocalPacks()
      const pack = packs.find(p => p.key === packKey)
      if (!pack) return NextResponse.json({ error: '本地不存在行业包: ' + packKey }, { status: 404 })
      if (!pack.valid) return NextResponse.json({ error: '行业包校验失败: ' + pack.errors.join('; ') }, { status: 400 })
      const result = await installPack(pack.dir, id, !!body.force)
      return NextResponse.json({ ok: true, result })
    }
    if (action === 'uninstall') {
      const result = await uninstallPack(packKey, id)
      return NextResponse.json({ ok: true, result })
    }
    return NextResponse.json({ error: '未知 action: ' + action }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
