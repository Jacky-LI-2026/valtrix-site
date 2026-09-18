import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// PUT /api/admin/member-levels/[id] — 更新等级（名称多语言/门槛/折扣/权益/排序）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const id = BigInt(params.id);
  const existing = await prisma.memberLevel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "等级不存在" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  (["nameEn", "nameJa", "nameKo", "nameFr", "nameAr"] as const).forEach((f) => {
    if (typeof body[f] === "string") data[f] = body[f].trim() || null;
  });
  if (body.threshold !== undefined && body.threshold !== null) {
    data.threshold = Math.max(0, Math.floor(Number(body.threshold) || 0));
  }
  if (body.discount !== undefined && body.discount !== null) {
    data.discount = Math.min(100, Math.max(0, Math.floor(Number(body.discount) || 0)));
  }
  (["benefits", "benefitsEn", "benefitsJa", "benefitsKo", "benefitsFr", "benefitsAr"] as const).forEach((f) => {
    if (typeof body[f] === "string") data[f] = body[f] || null;
  });
  if (body.sortOrder !== undefined && body.sortOrder !== null) {
    data.sortOrder = Math.floor(Number(body.sortOrder) || 0);
  }
  const lv = await prisma.memberLevel.update({ where: { id }, data });
  await recordOperation({ module: "member-levels", action: "update", target: lv.key });
  return NextResponse.json({ ok: true, key: lv.key });
}

// DELETE /api/admin/member-levels/[id] — 删除等级（默认等级与仍被会员使用的等级禁止删除）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const id = BigInt(params.id);
  const existing = await prisma.memberLevel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "等级不存在" }, { status: 404 });
  if (existing.isDefault) return NextResponse.json({ ok: false, error: "默认等级不可删除" }, { status: 400 });
  const inUse = await prisma.member.count({ where: { level: existing.key } });
  if (inUse > 0) return NextResponse.json({ ok: false, error: `该等级仍有 ${inUse} 位会员使用，请先调整会员等级` }, { status: 400 });
  await prisma.memberLevel.delete({ where: { id } });
  await recordOperation({ module: "member-levels", action: "delete", target: existing.key });
  return NextResponse.json({ ok: true });
}
