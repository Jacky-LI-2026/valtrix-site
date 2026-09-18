import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const ctx = await getTenantContext(request.headers)
  const siteWhere = buildSiteWhere(ctx.siteId) as any

  try {
    if (slug) {
      const section = await prisma.aboutSection.findFirst({ where: { slug, ...siteWhere } })
      if (!section || section.status !== 'published') {
        return cachedJson({ error: '板块不存在' }, 'content', 404)
      }
      return cachedJson(serializeBigInt(section), 'content')
    }

    const sections = await prisma.aboutSection.findMany({
      where: { status: 'published', ...siteWhere },
      orderBy: { sortOrder: 'asc' },
    })

    return cachedJson(serializeBigInt(sections), 'content')
  } catch (error) {
    console.error('获取关于我们失败:', error)
    return cachedJson({ error: '获取失败' }, 'content', 500)
  }
}
