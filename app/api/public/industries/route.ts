import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  try {
    const ctx = await getTenantContext(request.headers)
    const siteWhere = buildSiteWhere(ctx.siteId)
    if (slug) {
      const industry = await prisma.industry.findFirst({
        where: { slug, AND: [siteWhere] },
      })
      if (!industry || industry.status !== 'published') {
        return cachedJson({ error: '行业不存在' }, 'content', 404)
      }
      return cachedJson(serializeBigInt(industry), 'content')
    }

    const industries = await prisma.industry.findMany({
      where: { AND: [{ status: 'published' }, siteWhere] },
      orderBy: { sortOrder: 'asc' },
    })

    return cachedJson(serializeBigInt(industries), 'content')
  } catch (error) {
    console.error('获取行业失败:', error)
    return cachedJson({ error: '获取失败' }, 'content', 500)
  }
}
