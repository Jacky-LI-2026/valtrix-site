import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  try {
    const ctx = await getTenantContext(req.headers)
    const siteWhere = buildSiteWhere(ctx.siteId)
    if (slug) {
      const service = await prisma.service.findFirst({
        where: { slug, AND: [siteWhere] },
      })
      if (!service) {
        return cachedJson({ error: '服务不存在' }, 'content', 404)
      }
      return cachedJson(serializeBigInt(service), 'content')
    }

    const services = await prisma.service.findMany({
      where: { AND: [{ status: 'published' }, siteWhere] },
      orderBy: { sortOrder: 'asc' },
    })
    return cachedJson(serializeBigInt(services), 'content')
  } catch (error: any) {
    return cachedJson({ error: error.message }, 'content', 500)
  }
}
