import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * 产品同步上架/下架商城
 * POST /api/admin/products/[id]/sync-shop  —— 同步上架（存在则更新，不存在则创建）
 * DELETE /api/admin/products/[id]/sync-shop —— 下架（删除商城商品）
 * GET  /api/admin/products/[id]/sync-shop  —— 查询同步状态
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const productId = BigInt(params.id);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  if (!p) return NextResponse.json({ error: "产品不存在" }, { status: 404 });

  // 规格价格（增量模式）：从产品规格参数 specs 生成商城规格？产品 specs 是通用规格参数，非可选 SKU。
  // 同步时仅复制基础信息；规格由商城侧编辑（后台商城商品管理维护 specs/priceTiers）。
  const payload: Record<string, unknown> = {
    productId,
    slug: String(p.slug || `prod-${p.id}`),
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
    images: (p.images as unknown[])?.length ? p.images : undefined,
    unit: "件",
    status: "published",
    // 价格与库存：产品未定价则面议（null），避免误标价
    price: p.priceMin ?? null,
    stock: -1, // 同步商品默认不限库存（询价制转化，成交在后台）
    minOrder: p.moq && p.moq > 0 ? p.moq : 1,
  };

  const existing = await prisma.shopProduct.findUnique({ where: { productId } });
  let item;
  if (existing) {
    // 更新时保留商城侧已配置的 specs/priceTiers/分类/售价
    payload.slug = existing.slug; // 不覆盖已生成的 slug
    item = await prisma.shopProduct.update({ where: { productId }, data: payload });
  } else {
    item = await prisma.shopProduct.create({ data: payload as any });
  }
  return NextResponse.json({ ok: true, item: { id: String(item.id), slug: item.slug, status: item.status } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const productId = BigInt(params.id);
  const existing = await prisma.shopProduct.findUnique({ where: { productId } });
  if (!existing) return NextResponse.json({ ok: true, message: "未上架，无需下架" });
  await prisma.shopProduct.delete({ where: { productId } });
  return NextResponse.json({ ok: true, message: "已下架" });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const productId = BigInt(params.id);
  const existing = await prisma.shopProduct.findUnique({
    where: { productId },
    select: { id: true, slug: true, status: true, price: true },
  });
  return NextResponse.json({ synced: !!existing, shop: existing ? { id: String(existing.id), slug: existing.slug, status: existing.status, price: existing.price } : null });
}
