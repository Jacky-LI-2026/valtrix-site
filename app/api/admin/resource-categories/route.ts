import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const TITLE_FIELDS = ['title', 'titleEn', 'titleJa', 'titleKo', 'titleFr', 'titleAr'] as const
const DESC_FIELDS = ['description', 'descriptionEn', 'descriptionJa', 'descriptionKo', 'descriptionFr', 'descriptionAr'] as const

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
    const cats = await prisma.resourceCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(serializeBigInt(cats))
  } catch (error) {
    console.error('获取资源分类失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.title || !body.type) return NextResponse.json({ error: '标题和 type 不能为空' }, { status: 400 })
    const data = {
      type: body.type,
      title: body.title,
      icon: body.icon || null,
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
      ...pickFields(body, TITLE_FIELDS),
      ...pickFields(body, DESC_FIELDS),
    }
    const cat = await prisma.resourceCategory.create({ data })
    return NextResponse.json(serializeBigInt(cat))
  } catch (error: any) {
    console.error('新建资源分类失败:', error)
    return NextResponse.json({ error: error?.message || '新建失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    const data: any = { ...pickFields(body, TITLE_FIELDS), ...pickFields(body, DESC_FIELDS) }
    if (body.type !== undefined) data.type = body.type
    if (body.title !== undefined) data.title = body.title
    if (body.icon !== undefined) data.icon = body.icon || null
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    const cat = await prisma.resourceCategory.update({ where: { id: BigInt(body.id) }, data })
    return NextResponse.json(serializeBigInt(cat))
  } catch (error: any) {
    console.error('更新资源分类失败:', error)
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
    const count = await prisma.resourceItem.count({ where: { categoryId: BigInt(id) } })
    if (count > 0) return NextResponse.json({ error: `该分类下还有 ${count} 个资源，无法删除` }, { status: 400 })
    await prisma.resourceCategory.delete({ where: { id: BigInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除资源分类失败:', error)
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: 500 })
  }
}
