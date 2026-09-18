import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// GET /api/public/shop/products/[slug]
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const p = await prisma.shopProduct.findFirst({
    where: { slug: params.slug, status: "published" },
  });
  if (!p) return NextResponse.json({ ok: false, error: "商品不存在" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    product: {
      id: String(p.id),
      slug: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      nameJa: p.nameJa,
      nameKo: p.nameKo,
      nameFr: p.nameFr,
      nameAr: p.nameAr,
      summary: p.summary,
      summaryEn: p.summaryEn,
      summaryJa: p.summaryJa,
      summaryKo: p.summaryKo,
      summaryFr: p.summaryFr,
      summaryAr: p.summaryAr,
      description: p.description,
      descriptionEn: p.descriptionEn,
      descriptionJa: p.descriptionJa,
      descriptionKo: p.descriptionKo,
      descriptionFr: p.descriptionFr,
      descriptionAr: p.descriptionAr,
      coverImage: p.coverImage,
      images: p.images,
      specs: p.specs,
      modelFiles: p.modelFiles,
      priceTiers: p.priceTiers,
      price: p.price ? Number(p.price) : null,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      unit: p.unit,
      stock: p.stock,
      minOrder: p.minOrder,
      isParts: p.isParts,
    },
  });
}
