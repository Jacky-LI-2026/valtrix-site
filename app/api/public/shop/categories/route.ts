import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/public/shop/categories — 前台商城分类列表（仅含已上架商品或全部）
export async function GET() {
  const cats = await prisma.shopCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return NextResponse.json({
    ok: true,
    items: cats.map((c) => ({
      id: String(c.id),
      slug: c.slug,
      name: c.name,
      nameEn: c.nameEn,
      nameJa: c.nameJa,
      nameKo: c.nameKo,
      nameFr: c.nameFr,
      nameAr: c.nameAr,
    })),
  });
}
