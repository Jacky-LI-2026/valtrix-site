import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const TITLE_FIELDS = ['title', 'titleEn', 'titleJa', 'titleKo', 'titleFr', 'titleAr'] as const
const CONTENT_FIELDS = ['content', 'contentEn', 'contentJa', 'contentKo', 'contentFr', 'contentAr'] as const

function pickFields(body: any, fields: readonly string[]) {
  const data: any = {}
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f] || null
  }
  return data
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const list = await prisma.aiKnowledge.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] })
    return NextResponse.json(serializeBigInt(list))
  } catch (error) {
    console.error('获取 AI 知识库失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    const data = {
      title: body.title,
      category: body.category || null,
      tags: body.tags || null,
      source: body.source || 'manual',
      status: body.status || 'published',
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
      ...pickFields(body, TITLE_FIELDS),
      ...pickFields(body, CONTENT_FIELDS),
    }
    const item = await prisma.aiKnowledge.create({ data })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    console.error('新建 AI 知识失败:', error)
    return NextResponse.json({ error: error?.message || '新建失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    const data: any = { ...pickFields(body, TITLE_FIELDS), ...pickFields(body, CONTENT_FIELDS) }
    if (body.title !== undefined) data.title = body.title
    if (body.category !== undefined) data.category = body.category || null
    if (body.tags !== undefined) data.tags = body.tags || null
    if (body.source !== undefined) data.source = body.source
    if (body.status !== undefined) data.status = body.status
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    const item = await prisma.aiKnowledge.update({ where: { id: BigInt(body.id) }, data })
    return NextResponse.json(serializeBigInt(item))
  } catch (error: any) {
    console.error('更新 AI 知识失败:', error)
    return NextResponse.json({ error: error?.message || '更新失败' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    await prisma.aiKnowledge.delete({ where: { id: BigInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除 AI 知识失败:', error)
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: 500 })
  }
}
