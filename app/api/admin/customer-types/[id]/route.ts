import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = BigInt(params.id);
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {
    name: String(body.name || "").trim(),
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
  if (!data.name) return NextResponse.json({ error: "名称必填" }, { status: 400 });

  if (data.isDefault) {
    await prisma.$transaction(async (tx) => {
      await tx.customerType.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      await tx.customerType.update({ where: { id }, data: data as never });
    });
  } else {
    // 取消默认前检查是否只剩这一个默认
    const cur = await prisma.customerType.findUnique({ where: { id } });
    if (cur?.isDefault) {
      const others = await prisma.customerType.count({ where: { isDefault: true, id: { not: id } } });
      if (others === 0) return NextResponse.json({ error: "至少保留一个默认客户分类" }, { status: 400 });
    }
    await prisma.customerType.update({ where: { id }, data: data as never });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = BigInt(params.id);
  const cur = await prisma.customerType.findUnique({ where: { id } });
  if (!cur) return NextResponse.json({ error: "不存在" }, { status: 404 });
  if (cur.isDefault) return NextResponse.json({ error: "默认客户分类不可删除" }, { status: 400 });
  const used = await prisma.member.count({ where: { customerType: cur.key } });
  if (used > 0) return NextResponse.json({ error: `有 ${used} 个会员使用该分类，请先调整` }, { status: 400 });
  await prisma.customerType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
