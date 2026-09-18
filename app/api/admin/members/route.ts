import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/members?page=&size=&q= — 会员列表（倒序 + 收藏数 + 统计）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const size = Math.min(100, Math.max(1, Number(sp.get("size") || 20)));
  const q = (sp.get("q") || "").trim();
  const levelFilter = (sp.get("level") || "").trim();
  const where: any = levelFilter ? { level: levelFilter } : {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { phone: { contains: q } },
      { company: { contains: q } },
      { customerNo: { contains: q } },
    ];
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [total, activeCount, disabledCount, todayNew, members, levels, customerTypes] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.count({ where: { ...where, status: "active" } }),
    prisma.member.count({ where: { ...where, status: "disabled" } }),
    prisma.member.count({ where: { ...where, createdAt: { gte: todayStart } } }),
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
      include: { _count: { select: { favorites: true } } },
    }),
    prisma.memberLevel.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
    prisma.customerType.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
  ]);
  const levelNames: Record<string, string> = {};
  levels.forEach((lv) => (levelNames[lv.key] = lv.name));
  const typeNames: Record<string, string> = {};
  customerTypes.forEach((ct) => (typeNames[ct.key] = ct.name));
  return NextResponse.json({
    ok: true,
    total,
    stats: { total: total, active: activeCount, disabled: disabledCount, todayNew },
    levels: levels.map((lv) => ({ key: lv.key, name: lv.name })),
    customerTypes: customerTypes.map((ct) => ({ key: ct.key, name: ct.name })),
    page,
    size,
    members: members.map((m) => ({
      id: String(m.id),
      email: m.email,
      name: m.name,
      phone: m.phone,
      company: m.company,
      industry: m.industry,
      country: m.country,
      customerNo: m.customerNo,
      status: m.status,
      locale: m.locale,
      level: m.level,
      customerType: m.customerType,
      customerTypeName: typeNames[m.customerType] || m.customerType,
      points: m.points,
      levelName: levelNames[m.level] || m.level,
      lastLoginAt: m.lastLoginAt,
      createdAt: m.createdAt,
      favCount: m._count.favorites,
    })),
  });
}

// POST 不开放后台创建（会员由前台注册）
export async function POST() {
  return NextResponse.json({ ok: false, error: "会员由前台注册" }, { status: 400 });
}
