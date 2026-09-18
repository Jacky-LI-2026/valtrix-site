import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation, pickTarget } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/shop/products?page=1&limit=20&keyword=&status=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const keyword = searchParams.get("keyword")?.trim() || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (keyword) where.OR = [{ name: { contains: keyword } }, { slug: { contains: keyword } }];
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.shopProduct.count({ where }),
    prisma.shopProduct.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const cats = await prisma.shopCategory.findMany({ select: { id: true, name: true, nameEn: true, nameJa: true, nameKo: true, nameFr: true, nameAr: true } });
  const catMap = new Map(cats.map((c) => [String(c.id), c]));

  const toNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") return Number(v);
    // Prisma Decimal 实例有 toString()（返回 "999"），须在序列化前转换，否则 Number({s,e,d})=NaN
    if (typeof v.toString === "function") {
      const s = v.toString();
      const n = Number(s);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };

  return NextResponse.json({
    ok: true,
    total,
    page,
    limit,
    items: serializeBigInt(
      items.map((it: any) => {
        const cat = it.categoryId === null ? null : catMap.get(String(it.categoryId));
        return {
          ...it,
          price: toNum(it.price),
          originalPrice: toNum(it.originalPrice),
          categoryName: cat ? cat.name : null,
          categoryNameEn: cat ? cat.nameEn : null,
          categoryNameJa: cat ? cat.nameJa : null,
          categoryNameKo: cat ? cat.nameKo : null,
          categoryNameFr: cat ? cat.nameFr : null,
          categoryNameAr: cat ? cat.nameAr : null,
        };
      })
    ),
  });
}

// POST /api/admin/shop/products
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      slug, name, nameEn, nameJa, nameKo, nameFr, nameAr,
      summary, summaryEn, summaryJa, summaryKo, summaryFr, summaryAr,
      description, descriptionEn, descriptionJa, descriptionKo, descriptionFr, descriptionAr,
      coverImage, images, price, originalPrice, unit, stock, minOrder, status, featured, sortOrder,
      categoryId, priceTiers, specs, modelFiles,
    } = body || {};

    if (!name || !String(name).trim()) return NextResponse.json({ ok: false, error: "商品名称必填" }, { status: 400 });
    let finalSlug = String(slug || "").trim() || String(name).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    if (!finalSlug) finalSlug = "sp-" + Date.now().toString(36);
    const exists = await prisma.shopProduct.findUnique({ where: { slug: finalSlug } });
    if (exists) finalSlug = finalSlug + "-" + Date.now().toString(36).slice(-4);

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

    const p = await prisma.shopProduct.create({
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
    await recordOperation({ module: "shop:products", action: "create", target: pickTarget({ name: p.name, slug: p.slug }) });
    return NextResponse.json({ ok: true, data: serializeBigInt(p) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "创建失败：" + (e?.message || "") }, { status: 500 });
  }
}
