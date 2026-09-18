/**
 * 租户详情 API
 * PUT   更新租户
 * DELETE 删除租户（默认租户禁止删除；级联删站点）
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const { name, slug, edition, maxSites, maxSeats, contactName, contactEmail, remark, status, expiresAt } = body;

    if (slug) {
      const dup = await prisma.tenant.findFirst({ where: { slug, NOT: { id } } });
      if (dup) return NextResponse.json({ ok: false, error: "租户标识已存在" }, { status: 409 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: name ?? undefined,
        slug: slug ?? undefined,
        edition: edition ?? undefined,
        maxSites: maxSites != null ? Number(maxSites) : undefined,
        maxSeats: maxSeats != null ? Number(maxSeats) : undefined,
        contactName: contactName !== undefined ? contactName : undefined,
        contactEmail: contactEmail !== undefined ? contactEmail : undefined,
        remark: remark !== undefined ? remark : undefined,
        status: status ?? undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : expiresAt === null ? null : undefined,
      },
    });
    return NextResponse.json({ ok: true, tenant: { ...tenant, id: String(tenant.id) } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return NextResponse.json({ ok: false, error: "租户不存在" }, { status: 404 });
    if (tenant.slug === "default") return NextResponse.json({ ok: false, error: "默认租户禁止删除" }, { status: 400 });

    // 级联删除站点
    await prisma.site.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
