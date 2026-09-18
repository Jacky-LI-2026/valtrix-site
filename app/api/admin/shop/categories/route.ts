import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation, pickTarget } from "@/lib/operation-log";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/shop/categories
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const items = await prisma.shopCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return NextResponse.json({ ok: true, items: serializeBigInt(items) });
}

// POST /api/admin/shop/categories
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { slug, name, nameEn, nameJa, nameKo, nameFr, nameAr, sortOrder } = body || {};
    if (!name || !String(name).trim()) return NextResponse.json({ ok: false, error: "分类名称必填" }, { status: 400 });
    let finalSlug = String(slug || "").trim() || String(name).trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
    if (!finalSlug) finalSlug = "sc-" + Date.now().toString(36);
    const exists = await prisma.shopCategory.findUnique({ where: { slug: finalSlug } });
    if (exists) finalSlug = finalSlug + "-" + Date.now().toString(36).slice(-4);
    const c = await prisma.shopCategory.create({
      data: {
        slug: finalSlug,
        name: String(name).trim(),
        nameEn: nameEn || null, nameJa: nameJa || null, nameKo: nameKo || null, nameFr: nameFr || null, nameAr: nameAr || null,
        sortOrder: Number(sortOrder || 0),
      },
    });
    await recordOperation({ module: "shop:categories", action: "create", target: pickTarget({ name: c.name, slug: c.slug }) });
    return NextResponse.json({ ok: true, data: serializeBigInt(c) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "创建失败：" + (e?.message || "") }, { status: 500 });
  }
}
