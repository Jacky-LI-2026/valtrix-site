import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) result[key] = serializeBigInt(obj[key]);
    return result;
  }
  return obj;
}

// PUT /api/admin/templates/[id] - 更新模板（含设为默认）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const { name, slug, version, description, screenshot, config, isDefault, isActive, sortOrder } = body;

    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    // slug 唯一性校验（排除自身）
    if (slug && slug !== existing.slug) {
      const dup = await prisma.template.findUnique({ where: { slug } });
      if (dup) return NextResponse.json({ error: `模板标识 ${slug} 已存在` }, { status: 400 });
    }

    // 设为默认时，先取消其他模板的默认标记（事务）
    if (isDefault) {
      await prisma.$transaction([
        prisma.template.updateMany({ where: { id: { not: id } }, data: { isDefault: false } }),
        prisma.template.update({ where: { id }, data: { isDefault: true } }),
      ]);
    } else {
      await prisma.template.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          slug: slug ?? existing.slug,
          version: version ?? existing.version,
          description: description ?? existing.description,
          screenshot: screenshot ?? existing.screenshot,
          config: config ?? existing.config,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          sortOrder: sortOrder ?? existing.sortOrder,
        },
      });
    }

    const updated = await prisma.template.findUnique({ where: { id } });
    return NextResponse.json(serializeBigInt({ success: true, template: updated }));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `更新模板失败: ${e.message}` }, { status: 500 });
  }
}

// DELETE /api/admin/templates/[id] - 删除模板
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = BigInt(params.id);
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    if (existing.isDefault) {
      return NextResponse.json({ error: "默认模板不能删除，请先切换其他模板为默认" }, { status: 400 });
    }
    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `删除模板失败: ${e.message}` }, { status: 500 });
  }
}
