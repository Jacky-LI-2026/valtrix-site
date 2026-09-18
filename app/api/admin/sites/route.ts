import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { auth } from '@/auth'
import { invalidateTenantContext } from '@/lib/tenant/context'

// 站点管理：GET 列表 / POST 创建 / PUT 更新 / DELETE 删除 / ?action=setDefault 设默认
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const sites = await prisma.site.findMany({
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    include: { tenant: { select: { id: true, name: true, edition: true, status: true } } },
  })
  return NextResponse.json({ ok: true, sites: serializeBigInt(sites) })
}

function normDomains(v: any): string[] | undefined {
  if (v === null || v === undefined || v === '') return undefined
  if (Array.isArray(v)) return v.map(String).map((s: string) => s.trim()).filter(Boolean)
  try {
    const a = JSON.parse(String(v))
    return Array.isArray(a) ? a.map(String) : undefined
  } catch {
    return String(v).split(/[,，\n]/).map((s: string) => s.trim()).filter(Boolean)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'setDefault') {
    const id = Number(body.id)
    if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
    const site = await prisma.site.findUnique({ where: { id: BigInt(id) } })
    if (!site) return NextResponse.json({ error: '站点不存在' }, { status: 404 })
    await prisma.$transaction([
      prisma.site.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      prisma.site.update({ where: { id: BigInt(id) }, data: { isDefault: true, status: 'active' } }),
    ])
    invalidateTenantContext()
    return NextResponse.json({ ok: true })
  }

  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: '站点名称必填' }, { status: 400 })
  const domain = String(body.domain || '').trim() || null
  if (domain) {
    const dup = await prisma.site.findFirst({ where: { domain } })
    if (dup) return NextResponse.json({ error: `域名 ${domain} 已被站点「${dup.name}」使用` }, { status: 400 })
  }
  const tenantId = body.tenantId ? BigInt(Number(body.tenantId)) : BigInt(1)
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return NextResponse.json({ error: '租户不存在' }, { status: 400 })
  const siteCount = await prisma.site.count({ where: { tenantId } })
  if (siteCount >= tenant.maxSites) {
    return NextResponse.json({ error: `该租户站点数已达上限（${tenant.maxSites}）` }, { status: 400 })
  }

  const data: any = {
    tenantId,
    name,
    domain,
    domains: normDomains(body.domains) || undefined,
    templateSlug: String(body.templateSlug || 'default'),
    themeConfig: body.themeConfig || undefined,
    logo: String(body.logo || '') || null,
    favicon: String(body.favicon || '') || null,
    locale: String(body.locale || 'zh'),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  }
  if (body.isDefault) {
    await prisma.site.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    data.isDefault = true
  }
  const site = await prisma.site.create({ data })
  invalidateTenantContext()
  return NextResponse.json({ ok: true, site: serializeBigInt(site) })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const existing = await prisma.site.findUnique({ where: { id: BigInt(id) } })
  if (!existing) return NextResponse.json({ error: '站点不存在' }, { status: 404 })

  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: '站点名称必填' }, { status: 400 })
  const domain = String(body.domain || '').trim() || null
  if (domain) {
    const dup = await prisma.site.findFirst({ where: { domain, NOT: { id: BigInt(id) } } })
    if (dup) return NextResponse.json({ error: `域名 ${domain} 已被站点「${dup.name}」使用` }, { status: 400 })
  }

  const data: any = {
    name,
    domain,
    domains: normDomains(body.domains) || undefined,
    templateSlug: String(body.templateSlug || 'default'),
    themeConfig: body.themeConfig || undefined,
    logo: String(body.logo || '') || null,
    favicon: String(body.favicon || '') || null,
    locale: String(body.locale || 'zh'),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  }
  if (body.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: BigInt(Number(body.tenantId)) } })
    if (tenant) data.tenantId = tenant.id
  }
  if (body.isDefault && !existing.isDefault) {
    await prisma.site.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    data.isDefault = true
  }
  if (body.isDefault === false && existing.isDefault) {
    return NextResponse.json({ error: '默认站点不可取消默认（请先设置其他站点为默认）' }, { status: 400 })
  }
  const site = await prisma.site.update({ where: { id: BigInt(id) }, data })
  invalidateTenantContext()
  return NextResponse.json({ ok: true, site: serializeBigInt(site) })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const { searchParams } = req.nextUrl
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const site = await prisma.site.findUnique({ where: { id: BigInt(id) } })
  if (!site) return NextResponse.json({ error: '站点不存在' }, { status: 404 })
  if (site.isDefault) return NextResponse.json({ error: '默认站点不可删除' }, { status: 400 })
  const refCount = await prisma.product.count({ where: { siteId: BigInt(id) } })
  if (refCount > 0) return NextResponse.json({ error: `该站点下有 ${refCount} 条业务数据，请先迁移或清空` }, { status: 400 })
  await prisma.site.delete({ where: { id: BigInt(id) } })
  invalidateTenantContext()
  return NextResponse.json({ ok: true })
}
