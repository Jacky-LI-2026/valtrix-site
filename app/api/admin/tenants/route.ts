import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { auth } from '@/auth'
import { invalidateTenantContext } from '@/lib/tenant/context'

// 租户管理：GET 列表 / POST 创建 / PUT 更新 / DELETE 删除
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const tenants = await prisma.tenant.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { sites: true } } },
  })
  return NextResponse.json({ ok: true, tenants: serializeBigInt(tenants) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: '租户名称必填' }, { status: 400 })
  let slug = String(body.slug || '').trim().toLowerCase()
  if (!slug) {
    slug = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').slice(0, 20)
    if (!slug) slug = 'tenant-' + Date.now()
  }
  const dup = await prisma.tenant.findFirst({ where: { slug } })
  if (dup) return NextResponse.json({ error: `标识 ${slug} 已存在` }, { status: 400 })

  const data: any = {
    name,
    slug,
    edition: ['trial', 'standard', 'pro', 'enterprise'].includes(body.edition) ? body.edition : 'standard',
    status: body.status === 'inactive' ? 'inactive' : 'active',
    licenseCode: String(body.licenseCode || '') || null,
    maxSites: Math.max(1, Number(body.maxSites) || 1),
    maxSeats: Math.max(1, Number(body.maxSeats) || 5),
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    contactName: String(body.contactName || '') || null,
    contactEmail: String(body.contactEmail || '') || null,
    remark: String(body.remark || '') || null,
  }
  const tenant = await prisma.tenant.create({ data })
  return NextResponse.json({ ok: true, tenant: serializeBigInt(tenant) })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const existing = await prisma.tenant.findUnique({ where: { id: BigInt(id) } })
  if (!existing) return NextResponse.json({ error: '租户不存在' }, { status: 404 })
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: '租户名称必填' }, { status: 400 })

  const data: any = {
    name,
    edition: ['trial', 'standard', 'pro', 'enterprise'].includes(body.edition) ? body.edition : existing.edition,
    status: body.status === 'inactive' ? 'inactive' : 'active',
    licenseCode: body.licenseCode !== undefined ? (String(body.licenseCode || '') || null) : existing.licenseCode,
    maxSites: Math.max(1, Number(body.maxSites) || existing.maxSites),
    maxSeats: Math.max(1, Number(body.maxSeats) || existing.maxSeats),
    expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : existing.expiresAt,
    contactName: body.contactName !== undefined ? (String(body.contactName || '') || null) : existing.contactName,
    contactEmail: body.contactEmail !== undefined ? (String(body.contactEmail || '') || null) : existing.contactEmail,
    remark: body.remark !== undefined ? (String(body.remark || '') || null) : existing.remark,
  }
  const tenant = await prisma.tenant.update({ where: { id: BigInt(id) }, data })
  invalidateTenantContext()
  return NextResponse.json({ ok: true, tenant: serializeBigInt(tenant) })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: '参数错误' }, { status: 400 })
  const tenant = await prisma.tenant.findUnique({ where: { id: BigInt(id) } })
  if (!tenant) return NextResponse.json({ error: '租户不存在' }, { status: 404 })
  const siteCount = await prisma.site.count({ where: { tenantId: BigInt(id) } })
  if (siteCount > 0) return NextResponse.json({ error: `该租户下还有 ${siteCount} 个站点，请先删除站点` }, { status: 400 })
  if (tenant.id === BigInt(1)) return NextResponse.json({ error: '默认租户不可删除' }, { status: 400 })
  await prisma.tenant.delete({ where: { id: BigInt(id) } })
  return NextResponse.json({ ok: true })
}
