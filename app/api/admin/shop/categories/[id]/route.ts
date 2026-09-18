import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation, pickTarget } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

// PUT /api/admin/shop/categories/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const { slug, name, nameEn, nameJa, nameKo, nameFr, nameAr, sortOrder } = body || {};
    if (!name || !String(name).trim()) return NextResponse.json({ ok: false, error: "分类名称必填" }, { status: 400 });
    let finalSlug = String(slug || "").trim();
    if (!finalSlug) finalSlug = String(name).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    const dup = await prisma.shopCategory.findFirst({ where: { slug: finalSlug, NOT: { id } } });
    if (dup) finalSlug = finalSlug + "-" + Date.now().toString(36).slice(-4);
    const c = await prisma.shopCategory.update({
      where: { id },
      data: {
        slug: finalSlug,
        name: String(name).trim(),
        nameEn: nameEn || null, nameJa: nameJa || null, nameKo: nameKo || null, nameFr: nameFr || null, nameAr: nameAr || null,
        sortOrder: Number(sortOrder || 0),
      },
    });
    await recordOperation({ module: "shop:categories", action: "update", target: pickTarget({ name: c.name, slug: c.slug }) });
    return NextResponse.json({ ok: true, data: serializeBigInt(c) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "保存失败：" + (e?.message || "") }, { status: 500 });
  }
}

// DELETE /api/admin/shop/categories/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const existing = await prisma.shopCategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: "分类不存在" }, { status: 404 });
    const cnt = await prisma.shopProduct.count({ where: { categoryId: id } });
    if (cnt > 0) return NextResponse.json({ ok: false, error: `该分类下还有 ${cnt} 个商品，请先移出或删除商品` }, { status: 400 });
    await prisma.shopCategory.delete({ where: { id } });
    await recordOperation({ module: "shop:categories", action: "delete", target: pickTarget({ name: existing.name, slug: existing.slug }) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "删除失败：" + (e?.message || "") }, { status: 500 });
  }
}
