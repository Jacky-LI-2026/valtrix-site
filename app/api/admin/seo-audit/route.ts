import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MODELS = {
  product: { model: prisma.product, name: 'name', slug: 'slug', source: ['name', 'subtitle', 'summary'] },
  news: { model: prisma.news, name: 'title', slug: 'slug', source: ['title', 'summary', 'content'] },
  service: { model: prisma.service, name: 'name', slug: 'slug', source: ['name', 'subtitle', 'description'] },
  industry: { model: prisma.industry, name: 'name', slug: 'slug', source: ['name', 'tagline', 'summary'] },
  case: { model: prisma.case, name: 'title', slug: 'slug', source: ['title', 'summary', 'content'] },
} as const

type TypeKey = keyof typeof MODELS

// 统计各类型缺 SEO 数
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') as TypeKey | null

  // 无 type：返回统计
  if (!type) {
    const stats: Record<string, { total: number; missing: number }> = {}
    for (const key of Object.keys(MODELS) as TypeKey[]) {
      const m = MODELS[key] as any
      const all = await m.model.findMany({ select: { id: true, seoTitle: true, seoDescription: true } })
      const missing = all.filter((x: any) => !x.seoTitle || !x.seoDescription).length
      stats[key] = { total: all.length, missing }
    }
    return NextResponse.json({ stats })
  }

  if (!(type in MODELS)) return NextResponse.json({ error: '未知类型' }, { status: 400 })
  const m = MODELS[type] as any
  const all = await m.model.findMany()
  const list = all
    .filter((x: any) => !x.seoTitle || !x.seoDescription)
    .map((x: any) => {
      const name = String(x[m.name] || x[m.name + 'En'] || '')
      const src = m.source.map((k: string) => {
        const v = x[k]
        if (Array.isArray(v)) return v.map((i: any) => (typeof i === 'string' ? i : i?.text || i?.zh || '')).join(' ').slice(0, 120)
        return String(v || '').slice(0, 200)
      }).filter(Boolean).join(' ')
      return {
        id: String(x.id),
        name,
        missing: [!x.seoTitle ? '标题' : null, !x.seoDescription ? '描述' : null].filter(Boolean).join('、'),
        sourceText: src.slice(0, 600),
      }
    })
  return NextResponse.json({ list, count: list.length })
}

// 写回单条 SEO（只更新 seo 字段）
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { type, id, seo } = body
  if (!(type in MODELS) || !id || !seo) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const m = MODELS[type as TypeKey] as any
  const data: any = {}
  for (const k of ['seoTitle', 'seoDescription', 'seoKeywords', 'seoTitleEn', 'seoDescriptionEn', 'seoKeywordsEn']) {
    if (seo[k] !== undefined) data[k] = String(seo[k])
  }
  const item = await m.model.update({ where: { id: BigInt(id) }, data })
  return NextResponse.json({ success: true, id: String(item.id) })
}
