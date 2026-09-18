import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCoupon } from "@/lib/shop-coupon";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// PUT 更新（含启停）/ DELETE 删除
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = BigInt(params.id);
  const exist = await prisma.shopCoupon.findUnique({ where: { id } });
  if (!exist) return bad("券不存在", 404);
  const body = await req.json().catch(() => null);
  if (!body) return bad("参数错误");

  const code = body.code ? String(body.code).trim() : exist.code;
  if (code !== exist.code) {
    const dup = await prisma.shopCoupon.findUnique({ where: { code } });
    if (dup) return bad("券码已存在");
  }
  const type = body.type === "percent" ? "percent" : "fixed";
  const amount = body.amount !== undefined ? toNum(body.amount) : toNum(exist.amount);

  const coupon = await prisma.shopCoupon.update({
    where: { id },
    data: {
      code,
      name: body.name ? String(body.name).trim() : exist.name,
      nameEn: body.nameEn !== undefined ? (body.nameEn ? String(body.nameEn) : null) : exist.nameEn,
      nameJa: body.nameJa !== undefined ? (body.nameJa ? String(body.nameJa) : null) : exist.nameJa,
      nameKo: body.nameKo !== undefined ? (body.nameKo ? String(body.nameKo) : null) : exist.nameKo,
      nameFr: body.nameFr !== undefined ? (body.nameFr ? String(body.nameFr) : null) : exist.nameFr,
      nameAr: body.nameAr !== undefined ? (body.nameAr ? String(body.nameAr) : null) : exist.nameAr,
      type,
      amount,
      minAmount: body.minAmount !== undefined ? toNum(body.minAmount) : toNum(exist.minAmount),
      maxDiscount: body.maxDiscount !== undefined ? (type === "percent" && toNum(body.maxDiscount) > 0 ? toNum(body.maxDiscount) : null) : exist.maxDiscount,
      startAt: body.startAt !== undefined ? (body.startAt ? new Date(body.startAt) : null) : exist.startAt,
      endAt: body.endAt !== undefined ? (body.endAt ? new Date(body.endAt) : null) : exist.endAt,
      total: body.total !== undefined ? Math.max(0, Math.floor(toNum(body.total))) : exist.total,
      perUser: body.perUser !== undefined ? Math.max(1, Math.floor(toNum(body.perUser) || 1)) : exist.perUser,
      isActive: body.isActive !== undefined ? !!body.isActive : exist.isActive,
    },
  });
  return NextResponse.json({ ok: true, coupon: serializeCoupon(coupon) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = BigInt(params.id);
  const exist = await prisma.shopCoupon.findUnique({ where: { id } });
  if (!exist) return bad("券不存在", 404);
  await prisma.shopCouponClaim.deleteMany({ where: { couponId: id } });
  await prisma.shopCoupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
