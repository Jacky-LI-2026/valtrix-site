import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/member-levels — 等级列表（含各等级会员数）
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const [levels, counts] = await Promise.all([
    prisma.memberLevel.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.member.groupBy({ by: ["level"], _count: { _all: true } }),
  ]);
  const countMap: Record<string, number> = {};
  counts.forEach((c) => (countMap[c.level] = c._count._all));
  return NextResponse.json({
    ok: true,
    levels: levels.map((lv) => ({
      id: String(lv.id),
      key: lv.key,
      name: lv.name,
      nameEn: lv.nameEn,
      nameJa: lv.nameJa,
      nameKo: lv.nameKo,
      nameFr: lv.nameFr,
      nameAr: lv.nameAr,
      threshold: lv.threshold,
      discount: lv.discount,
      benefits: lv.benefits,
      benefitsEn: lv.benefitsEn,
      benefitsJa: lv.benefitsJa,
      benefitsKo: lv.benefitsKo,
      benefitsFr: lv.benefitsFr,
      benefitsAr: lv.benefitsAr,
      sortOrder: lv.sortOrder,
      isDefault: lv.isDefault,
      memberCount: countMap[lv.key] || 0,
    })),
  });
}

// POST /api/admin/member-levels — 新增等级
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const name = String(body.name || "").trim();
  if (!key || !name) return NextResponse.json({ ok: false, error: "等级 key 与名称必填" }, { status: 400 });
  if (!/^[a-z][a-z0-9-]{1,28}$/.test(key)) {
    return NextResponse.json({ ok: false, error: "key 需为小写字母/数字/连字符（2-30 位）" }, { status: 400 });
  }
  const exists = await prisma.memberLevel.findUnique({ where: { key } });
  if (exists) return NextResponse.json({ ok: false, error: "等级 key 已存在" }, { status: 400 });
  const lv = await prisma.memberLevel.create({
    data: {
      key,
      name,
      nameEn: body.nameEn || null,
      nameJa: body.nameJa || null,
      nameKo: body.nameKo || null,
      nameFr: body.nameFr || null,
      nameAr: body.nameAr || null,
      threshold: Math.max(0, Math.floor(Number(body.threshold) || 0)),
      discount: Math.min(100, Math.max(0, Math.floor(Number(body.discount) || 0))),
      benefits: body.benefits || null,
      benefitsEn: body.benefitsEn || null,
      benefitsJa: body.benefitsJa || null,
      benefitsKo: body.benefitsKo || null,
      benefitsFr: body.benefitsFr || null,
      benefitsAr: body.benefitsAr || null,
      sortOrder: Math.floor(Number(body.sortOrder) || 0),
      isDefault: false,
    },
  });
  await recordOperation({ module: "member-levels", action: "create", target: key });
  return NextResponse.json({ ok: true, id: String(lv.id), key: lv.key });
}
