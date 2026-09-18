import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 客户分类管理：GET 列表（含会员数）/ POST 新增 */
export async function GET() {
  const types = await prisma.customerType.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const result = [];
  for (const t of types) {
    const memberCount = await prisma.member.count({ where: { customerType: t.key } });
    result.push({
      id: String(t.id), key: t.key, name: t.name,
      nameEn: t.nameEn, nameJa: t.nameJa, nameKo: t.nameKo, nameFr: t.nameFr, nameAr: t.nameAr,
      discount: t.discount, seePartsPrice: t.seePartsPrice, isDefault: t.isDefault, sortOrder: t.sortOrder,
      memberCount,
    });
  }
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  if (!key || !name) return NextResponse.json({ error: "key 和名称必填" }, { status: 400 });
  if (!/^[a-z][a-z0-9_]{1,29}$/.test(key)) {
    return NextResponse.json({ error: "key 只能为小写字母/数字/下划线，2-30 位" }, { status: 400 });
  }
  const exists = await prisma.customerType.findUnique({ where: { key } });
  if (exists) return NextResponse.json({ error: "该 key 已存在" }, { status: 400 });

  const data = {
    key,
    name,
    nameEn: body.nameEn || null,
    nameJa: body.nameJa || null,
    nameKo: body.nameKo || null,
    nameFr: body.nameFr || null,
    nameAr: body.nameAr || null,
    discount: Math.max(0, Math.min(100, Number(body.discount) || 0)),
    seePartsPrice: Boolean(body.seePartsPrice),
    isDefault: Boolean(body.isDefault),
    sortOrder: Number(body.sortOrder) || 0,
  };
  if (data.isDefault) {
    await prisma.$transaction(async (tx) => {
      await tx.customerType.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      await tx.customerType.create({ data });
    });
  } else {
    await prisma.customerType.create({ data });
  }
  return NextResponse.json({ ok: true });
}
