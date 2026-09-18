/**
 * 站点详情 API
 * PUT   更新站点（默认站切换、域名改绑、主题覆盖）
 * DELETE 删除站点（默认站点禁止删除）
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const { tenantId, name, domain, domains, templateSlug, themeConfig, logo, favicon, locale, isDefault, status } = body;

    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) return NextResponse.json({ ok: false, error: "站点不存在" }, { status: 404 });

    // 域名唯一校验（排除自身）
    if (domain) {
      const dup = await prisma.site.findFirst({ where: { domain, NOT: { id } } });
      if (dup) return NextResponse.json({ ok: false, error: "域名已被占用" }, { status: 409 });
    }

    // 取消其它默认
    if (isDefault) {
      await prisma.site.updateMany({ where: { NOT: { id }, isDefault: true }, data: { isDefault: false } });
    }
    // 取消当前默认
    if (isDefault === false && site.isDefault) {
      return NextResponse.json({ ok: false, error: "默认站点不能被取消" }, { status: 400 });
    }

    const updated = await prisma.site.update({
      where: { id },
      data: {
        tenantId: tenantId ? BigInt(String(tenantId)) : undefined,
        name: name ?? undefined,
        domain: domain !== undefined ? (domain || null) : undefined,
        domains: domains !== undefined ? domains : undefined,
        templateSlug: templateSlug ?? undefined,
        themeConfig: themeConfig !== undefined ? themeConfig : undefined,
        logo: logo !== undefined ? (logo || null) : undefined,
        favicon: favicon !== undefined ? (favicon || null) : undefined,
        locale: locale ?? undefined,
        isDefault: isDefault ?? undefined,
        status: status ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, site: { ...updated, id: String(updated.id), tenantId: String(updated.tenantId) } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) return NextResponse.json({ ok: false, error: "站点不存在" }, { status: 404 });
    if (site.isDefault) return NextResponse.json({ ok: false, error: "默认站点禁止删除" }, { status: 400 });

    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
