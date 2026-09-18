import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation, pickTarget } from "@/lib/operation-log";

export const dynamic = "force-dynamic";

// PUT /api/admin/shop/products/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const {
      slug, name, nameEn, nameJa, nameKo, nameFr, nameAr,
      summary, summaryEn, summaryJa, summaryKo, summaryFr, summaryAr,
      description, descriptionEn, descriptionJa, descriptionKo, descriptionFr, descriptionAr,
      coverImage, images, price, originalPrice, unit, stock, minOrder, status, featured, sortOrder,
      categoryId, priceTiers, specs, modelFiles,
    } = body || {};

    if (!name || !String(name).trim()) return NextResponse.json({ ok: false, error: "商品名称必填" }, { status: 400 });

    const existing = await prisma.shopProduct.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: "商品不存在" }, { status: 404 });

    let finalSlug = String(slug || "").trim();
    if (!finalSlug) finalSlug = String(name).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    if (!finalSlug) finalSlug = "sp-" + Date.now().toString(36);
    const dup = await prisma.shopProduct.findFirst({ where: { slug: finalSlug, NOT: { id } } });
    if (dup) finalSlug = finalSlug + "-" + Date.now().toString(36).slice(-4);

    // 多图：接受 [{url,alt}] 或 字符串数组/换行文本；空=清空(null)，缺省=保留
    let imagesData: unknown = undefined;
    if (Array.isArray(images)) {
      imagesData = images
        .map((u: any) => (typeof u === "string" ? { url: u.trim() } : u))
        .filter((u: any) => u && u.url);
      if ((imagesData as any[]).length === 0) imagesData = null;
    } else if (typeof images === "string") {
      const arr = images.split("\n").map((u) => u.trim()).filter(Boolean).map((u) => ({ url: u }));
      imagesData = arr.length > 0 ? arr : null;
    }

    // 阶梯价：[{qty, price}]；空数组=清空(null)，缺省=保留
    let tiersData: unknown = undefined;
    if (Array.isArray(priceTiers)) {
      tiersData = priceTiers
        .filter((t: any) => t && Number(t.qty) > 0 && t.price !== "" && t.price !== null && t.price !== undefined)
        .map((t: any) => ({ qty: Number(t.qty), price: Number(t.price) }));
      if ((tiersData as any[]).length === 0) tiersData = null;
    }

    const p = await prisma.shopProduct.update({
      where: { id },
      data: {
        slug: finalSlug,
        name: String(name).trim(),
        nameEn: nameEn || null, nameJa: nameJa || null, nameKo: nameKo || null, nameFr: nameFr || null, nameAr: nameAr || null,
        summary: summary || null, summaryEn: summaryEn || null, summaryJa: summaryJa || null, summaryKo: summaryKo || null, summaryFr: summaryFr || null, summaryAr: summaryAr || null,
        description: description || null, descriptionEn: descriptionEn || null, descriptionJa: descriptionJa || null, descriptionKo: descriptionKo || null, descriptionFr: descriptionFr || null, descriptionAr: descriptionAr || null,
        coverImage: coverImage || null,
        images: imagesData as any,
        categoryId: categoryId === "" || categoryId === null || categoryId === undefined ? null : BigInt(categoryId),
        priceTiers: tiersData as any,
        specs: Array.isArray(specs) ? specs : undefined,
        modelFiles: Array.isArray(modelFiles) ? modelFiles.filter((f: any) => f && String(f.name || "").trim() && String(f.url || "").trim()) : undefined,
        price: price === "" || price === null || price === undefined ? null : Number(price),
        originalPrice: originalPrice === "" || originalPrice === null || originalPrice === undefined ? null : Number(originalPrice),
        unit: unit || null,
        stock: stock === undefined || stock === null || stock === "" ? 0 : Number(stock),
        minOrder: minOrder === undefined || minOrder === null || minOrder === "" ? 1 : Math.max(1, Number(minOrder)),
        status: status || "published",
        featured: !!featured,
        sortOrder: Number(sortOrder || 0),
      },
    });
    await recordOperation({ module: "shop:products", action: "update", target: pickTarget({ name: p.name, slug: p.slug }) });
    return NextResponse.json({ ok: true, data: serializeBigInt(p) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "保存失败：" + (e?.message || "") }, { status: 500 });
  }
}

// DELETE /api/admin/shop/products/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const existing = await prisma.shopProduct.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: "商品不存在" }, { status: 404 });
    await prisma.shopProduct.delete({ where: { id } });
    await recordOperation({ module: "shop:products", action: "delete", target: pickTarget({ name: existing.name, slug: existing.slug }) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "删除失败：" + (e?.message || "") }, { status: 500 });
  }
}
