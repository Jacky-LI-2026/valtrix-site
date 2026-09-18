import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/members/[id] — 会员详情（基本信息 + 收藏 + 商城订单）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const id = BigInt(params.id);
  const member = await prisma.member.findUnique({
    where: { id },
    include: { _count: { select: { favorites: true } } },
  });
  if (!member) {
    return NextResponse.json({ ok: false, error: "会员不存在" }, { status: 404 });
  }
  const [favorites, orders, levelRow, customerTypesRows] = await Promise.all([
    prisma.memberFavorite.findMany({
      where: { memberId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { id: true, slug: true, model: true, name: true, nameEn: true, images: true } },
      },
    }),
    prisma.shopOrder.findMany({
      where: { memberId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNo: true,
        amount: true,
        discountAmount: true,
        status: true,
        payMethod: true,
        items: true,
        createdAt: true,
      },
    }),
    prisma.memberLevel.findUnique({ where: { key: member.level } }).catch(() => null),
    prisma.customerType.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
  ]);
  const customerTypes = customerTypesRows.map((ct: any) => ({ key: ct.key, name: ct.name }));
  return NextResponse.json({
    ok: true,
    customerTypes,
    member: {
      id: String(member.id),
      email: member.email,
      name: member.name,
      phone: member.phone,
      company: member.company,
      industry: member.industry,
      country: member.country,
      customerNo: member.customerNo,
      customerType: member.customerType,
      status: member.status,
      locale: member.locale,
      level: member.level,
      points: member.points,
      levelName: levelRow?.name ?? member.level,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      favTotal: member._count.favorites,
    },
    favorites: favorites.map((f) => ({
      id: String(f.id),
      createdAt: f.createdAt,
      product: {
        id: String(f.product.id),
        slug: f.product.slug,
        model: f.product.model,
        name: f.product.name,
        nameEn: f.product.nameEn,
        images: f.product.images,
      },
    })),
    orders: orders.map((o) => ({
      id: String(o.id),
      orderNo: o.orderNo,
      amount: Number(o.amount),
      discountAmount: Number(o.discountAmount),
      status: o.status,
      payMethod: o.payMethod,
      itemCount: Array.isArray(o.items) ? o.items.length : 0,
      createdAt: o.createdAt,
    })),
  });
}

// PUT /api/admin/members/[id] — 启用/禁用、调整等级/积分
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.status === "disabled" || body.status === "active") data.status = body.status;
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 200) || null;
  if (typeof body.industry === "string") data.industry = body.industry.trim().slice(0, 50) || null;
  if (typeof body.country === "string") data.country = body.country.trim().slice(0, 50) || null;
  if (typeof body.level === "string" && body.level) {
    const lv = await prisma.memberLevel.findUnique({ where: { key: body.level } });
    if (!lv) return NextResponse.json({ ok: false, error: "等级不存在" }, { status: 400 });
    data.level = body.level;
  }
  if (typeof body.customerType === "string" && body.customerType) {
    const ct = await prisma.customerType.findUnique({ where: { key: body.customerType } });
    if (!ct) return NextResponse.json({ ok: false, error: "客户分类不存在" }, { status: 400 });
    data.customerType = body.customerType;
  }
  if (typeof body.points === "number" && Number.isFinite(body.points)) {
    data.points = Math.max(0, Math.floor(body.points));
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: "无可更新字段" }, { status: 400 });
  const member = await prisma.member.update({
    where: { id: BigInt(params.id) },
    data,
  });
  await recordOperation({ module: "members", action: "update", target: String(params.id) });
  return NextResponse.json({ ok: true, status: member.status, level: member.level, points: member.points });
}

// DELETE /api/admin/members/[id] — 删除会员（级联删除收藏）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  await prisma.member.delete({ where: { id: BigInt(params.id) } });
  await recordOperation({ module: "members", action: "delete", target: String(params.id) });
  return NextResponse.json({ ok: true });
}
