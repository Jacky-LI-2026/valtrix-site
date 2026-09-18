import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/public/shop/products?featured=1&limit=12&page=1&q=&category=slug
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get("featured") === "1";
  const limit = Math.min(Number(searchParams.get("limit") || 24), 60);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const keyword = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";

  const where: Record<string, unknown> = { status: "published" };
  if (featured) where.featured = true;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { nameEn: { contains: keyword } },
      { summary: { contains: keyword } },
    ];
  }
  if (category) {
    const cat = await prisma.shopCategory.findUnique({ where: { slug: category } });
    if (!cat) return NextResponse.json({ ok: true, total: 0, page, limit, items: [] });
    where.categoryId = cat.id;
  }

  const [total, items] = await Promise.all([
    prisma.shopProduct.count({ where }),
    prisma.shopProduct.findMany({
      where,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    total,
    page,
    limit,
    items: items.map((p) => ({
      id: String(p.id),
      slug: p.slug,
      categoryId: p.categoryId === null ? null : String(p.categoryId),
      name: p.name,
      nameEn: p.nameEn,
      nameJa: p.nameJa,
      nameKo: p.nameKo,
      nameFr: p.nameFr,
      nameAr: p.nameAr,
      summary: p.summary,
      summaryEn: p.summaryEn,
      coverImage: p.coverImage,
      priceTiers: p.priceTiers,
      price: p.price ? Number(p.price) : null,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      unit: p.unit,
      stock: p.stock,
      minOrder: p.minOrder,
      featured: p.featured,
      isParts: p.isParts,
    })),
  });
}
