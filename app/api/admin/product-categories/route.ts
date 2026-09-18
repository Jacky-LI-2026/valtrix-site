import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'

const LANG_FIELDS = ['name', 'nameEn', 'nameJa', 'nameKo', 'nameFr', 'nameAr'] as const

function pickLangFields(body: any) {
  const data: any = {}
  for (const f of LANG_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f] || null
  }
  return data
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tabId = searchParams.get('tabId')

    const where: any = {}
    if (tabId) where.tabId = BigInt(tabId)

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(serializeBigInt(categories))
  } catch (error) {
    console.error('获取产品分类失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.slug || !body.tabId) {
      return NextResponse.json({ error: '名称、slug 和所属 Tab 不能为空' }, { status: 400 })
    }
    const data = {
      tabId: BigInt(body.tabId),
      slug: body.slug,
      name: body.name,
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
      ...pickLangFields(body),
    }
    const category = await prisma.productCategory.create({ data })
    return NextResponse.json(serializeBigInt(category))
  } catch (error: any) {
    console.error('新建产品分类失败:', error)
    return NextResponse.json({ error: error?.message || '新建失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }
    const data: any = { ...pickLangFields(body) }
    if (body.slug !== undefined) data.slug = body.slug
    if (body.name !== undefined) data.name = body.name
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    if (body.tabId !== undefined) data.tabId = BigInt(body.tabId)
    const category = await prisma.productCategory.update({
      where: { id: BigInt(body.id) },
      data,
    })
    return NextResponse.json(serializeBigInt(category))
  } catch (error: any) {
    console.error('更新产品分类失败:', error)
    return NextResponse.json({ error: error?.message || '更新失败' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 })
    }
    const count = await prisma.product.count({ where: { categoryId: BigInt(id) } })
    if (count > 0) {
      return NextResponse.json({ error: `该分类下还有 ${count} 个产品，无法删除` }, { status: 400 })
    }
    await prisma.productCategory.delete({ where: { id: BigInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除产品分类失败:', error)
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: 500 })
  }
}
