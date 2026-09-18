/**
 * 通用表单 · 管理 API
 * GET /api/admin/forms 列表（含提交数）
 * POST /api/admin/forms 新建表单定义
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const where: any = q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {};
  const list = await prisma.formDefinition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return NextResponse.json(serializeBigInt(list.map((f: any) => ({ ...f, submitCount: f._count.submissions }))));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!name || !slug) return NextResponse.json({ error: "名称与标识不能为空" }, { status: 400 });
    const dup = await prisma.formDefinition.findUnique({ where: { slug } });
    if (dup) return NextResponse.json({ error: "标识已存在" }, { status: 409 });
    const created = await prisma.formDefinition.create({
      data: {
        name,
        slug,
        title: (body.title as any) || { zh: name },
        description: body.description || undefined,
        fields: body.fields || [],
        submitLabel: body.submitLabel || undefined,
        status: body.status === "inactive" ? "inactive" : "active",
      },
    });
    return NextResponse.json(serializeBigInt(created));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
