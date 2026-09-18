import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'
import { adminCreateSiteId, adminListFilter } from '@/lib/tenant/admin-scope'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const items = await prisma.job.findMany({ where: adminListFilter(), orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(serializeBigInt(items))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
  await recordOperation({ module: 'careers', action: 'create', target: pickTarget(body) })
    // 自动生成slug（优先英文标题，其次中文标题）
    const src = body.titleEn || body.title || ''
    const finalSlug = body.slug || src.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').substring(0, 100)
    const item = await prisma.job.create({ data: { ...body, slug: finalSlug, siteId: adminCreateSiteId() } })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
