import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation, pickTarget } from '@/lib/operation-log'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const item = await prisma.job.findUnique({ where: { id: BigInt(params.id) } })
    if (!item) return NextResponse.json({ error: '职位不存在' }, { status: 404 })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
  await recordOperation({ module: 'careers', action: 'update', target: pickTarget(body) })
    // 自动生成slug（优先英文标题，其次中文标题）
    const src = body.titleEn || body.title || ''
    const finalSlug = body.slug || src.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').substring(0, 100)
    const item = await prisma.job.update({ where: { id: BigInt(params.id) }, data: { ...body, slug: finalSlug } })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    await prisma.job.delete({ where: { id: BigInt(params.id) } })
    await recordOperation({ module: 'careers', action: 'delete', target: String(params.id) })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
