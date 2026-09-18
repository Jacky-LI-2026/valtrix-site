import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { getAdminSiteId, ADMIN_SITE_COOKIE } from '@/lib/tenant/admin-scope'
import { auth } from "@/auth";

// 站点切换 cookie 由本 API 写入（route handler 才能写 cookie）
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const siteId = getAdminSiteId()
  const sites = await prisma.site.findMany({ where: { status: 'active' }, orderBy: { isDefault: 'desc' } })
  return NextResponse.json({
    ok: true,
    currentSiteId: siteId ? String(siteId) : null,
    sites: serializeBigInt(sites),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}))
  const raw = body.siteId
  let siteId: string | null = null
  if (raw !== null && raw !== undefined && raw !== '') {
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) {
      const exists = await prisma.site.findFirst({ where: { id: BigInt(n) } })
      if (exists) siteId = String(n)
    }
  }
  const res = NextResponse.json({ ok: true, currentSiteId: siteId })
  if (siteId) {
    res.cookies.set(ADMIN_SITE_COOKIE, siteId, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false })
  } else {
    res.cookies.set(ADMIN_SITE_COOKIE, '', { path: '/', maxAge: 0 })
  }
  return res
}
