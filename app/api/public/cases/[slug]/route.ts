import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";

// 案例详情（slug），并返回相关案例
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const item = await prisma.case.findFirst({
      where: { slug: params.slug, status: "published" },
    });
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    const related = await prisma.case.findMany({
      where: {
        status: "published",
        id: { not: item.id },
        OR: item.industry ? [{ industry: item.industry }, { industryEn: item.industry }] : undefined,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      take: 4,
    });
    // 无同行业时兜底取最新
    const list = related.length ? related : await prisma.case.findMany({
      where: { status: "published", id: { not: item.id } },
      orderBy: [{ featured: "desc" }, { id: "desc" }],
      take: 4,
    });
    return NextResponse.json(serializeBigInt({ ...item, related: list }));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
