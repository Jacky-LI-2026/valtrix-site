import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCoupon } from "@/lib/shop-coupon";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "CPN" + s;
}

const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// GET 列表（含已领取数）/ POST 新建
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const list = await prisma.shopCoupon.findMany({ orderBy: { id: "desc" } });
  return NextResponse.json({ ok: true, coupons: list.map(serializeCoupon) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return bad("参数错误");
  const name = String(body.name || "").trim();
  if (!name) return bad("请填写券名称");
  const type = body.type === "percent" ? "percent" : "fixed";
  const amount = toNum(body.amount);
  if (amount <= 0) return bad("请填写有效金额/折扣");
  const code = String(body.code || "").trim() || genCode();
  const exist = await prisma.shopCoupon.findUnique({ where: { code } });
  if (exist) return bad("券码已存在，请更换");

  const coupon = await prisma.shopCoupon.create({
    data: {
      code,
      name,
      nameEn: body.nameEn ? String(body.nameEn) : null,
      nameJa: body.nameJa ? String(body.nameJa) : null,
      nameKo: body.nameKo ? String(body.nameKo) : null,
      nameFr: body.nameFr ? String(body.nameFr) : null,
      nameAr: body.nameAr ? String(body.nameAr) : null,
      type,
      amount,
      minAmount: toNum(body.minAmount),
      maxDiscount: type === "percent" && toNum(body.maxDiscount) > 0 ? toNum(body.maxDiscount) : null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      total: Math.max(0, Math.floor(toNum(body.total))),
      perUser: Math.max(1, Math.floor(toNum(body.perUser) || 1)),
      isActive: body.isActive !== false,
    },
  });
  return NextResponse.json({ ok: true, coupon: serializeCoupon(coupon) });
}
