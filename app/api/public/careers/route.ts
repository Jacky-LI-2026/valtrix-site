import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { cachedJson } from "@/lib/api-cache";
import { getTenantContext } from "@/lib/tenant/context";
import { buildSiteWhere } from "@/lib/tenant/scope";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const department = searchParams.get('department')

  try {
    const ctx = await getTenantContext(request.headers)
    const siteWhere = buildSiteWhere(ctx.siteId)
    if (slug) {
      const job = await prisma.job.findFirst({ where: { slug, AND: [siteWhere] } })
      if (!job || job.status !== 'open') {
        return cachedJson({ error: '职位不存在' }, 'content', 404)
      }
      return cachedJson(serializeBigInt(job), 'content')
    }

    const where: any = { AND: [{ status: 'open' }, siteWhere] }
    if (department) where.department = department

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })

    return cachedJson(serializeBigInt(jobs), 'content')
  } catch (error) {
    console.error('获取招聘职位失败:', error)
    return cachedJson({ error: '获取失败' }, 'content', 500)
  }
}
