import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

// PUT：更新动态内容类型
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (fields.length === 0) return NextResponse.json({ error: "至少定义一个字段" }, { status: 400 });
    const titleField = String(body.titleField || fields[0].name);
    const listColumns = Array.isArray(body.listColumns) && body.listColumns.length
      ? body.listColumns
      : fields.map((f: any) => ({ key: f.name, label: f.label }));
    const def = await prisma.contentTypeDef.update({
      where: { id: BigInt(params.id) },
      data: {
        label: String(body.label),
        labelEn: body.labelEn || "",
        description: body.description || "",
        fields,
        listColumns,
        titleField,
        slugField: body.slugField || null,
        enableSeo: !!body.enableSeo,
        enableStatus: body.enableStatus !== false,
        sortOrder: Number(body.sortOrder) || 0,
        active: body.active !== false,
      },
    });
    return NextResponse.json(serializeBigInt(def));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE：删除动态内容类型（连同条目）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const def = await prisma.contentTypeDef.findUnique({ where: { id: BigInt(params.id) } });
    if (!def) return NextResponse.json({ error: "类型不存在" }, { status: 404 });
    await prisma.$transaction([
      prisma.dynamicContent.deleteMany({ where: { type: def.name } }),
      prisma.contentTypeDef.delete({ where: { id: BigInt(params.id) } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
