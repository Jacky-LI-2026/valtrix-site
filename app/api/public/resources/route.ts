import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const category = searchParams.get('category')

  try {
    const ctx = await getTenantContext(request.headers)
    const siteWhere = buildSiteWhere(ctx.siteId)
    const where: any = { AND: [{ status: 'published' }, siteWhere] }
    if (type || category) {
      const cat = await prisma.resourceCategory.findUnique({
        where: { type: type || category || '' },
      })
      if (cat) where.categoryId = cat.id
    }

    const categories = await prisma.resourceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where,
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return cachedJson(serializeBigInt(categories), 'content')
  } catch (error) {
    console.error('获取资源失败:', error)
    return cachedJson({ error: '获取失败' }, 'content', 500)
  }
}
