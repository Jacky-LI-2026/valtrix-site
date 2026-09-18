import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// 前台 FAQ 列表（公开）
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const limit = Number(sp.get("limit") || 100);
  try {
    const where: any = { status: "published" };
    if (category) where.category = category;
    const items = await prisma.faq.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: Math.min(limit, 200),
    });
    // 分类汇总
    const categories = await prisma.faq.findMany({
      where: { status: "published" },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return NextResponse.json(
      serializeBigInt({
        items,
        categories: categories.map((c) => c.category).filter(Boolean),
      })
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
