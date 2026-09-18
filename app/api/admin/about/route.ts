import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'
import { adminListFilter, adminCreateSiteId } from '@/lib/tenant/admin-scope'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const siteWhere = adminListFilter()
    const items = await prisma.aboutSection.findMany({ where: siteWhere, orderBy: { sortOrder: 'asc' } })
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
    if (body.siteId == null) {
      const viewSiteId = adminCreateSiteId()
      if (viewSiteId) body.siteId = viewSiteId
    }
    await recordOperation({ module: 'about', action: 'create', target: pickTarget(body) })
    const item = await prisma.aboutSection.create({ data: body })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
