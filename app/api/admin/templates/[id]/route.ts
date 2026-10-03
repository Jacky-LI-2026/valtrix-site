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

    // ---- 组装字段更新 ----
    // ⚠️ 2026-09-14 修复（既有 BUG）：原实现在 `if (isDefault) { … } else { … 保存其他字段 … }`
    //    里，导致「设为默认」时 **name/slug/version/description/screenshot/config/sortOrder 全部被跳过**。
    //    现改为：字段更新**始终执行**，互斥操作作为额外的事务步骤。
    const data: Record<string, any> = {
      name: name ?? existing.name,
      slug: slug ?? existing.slug,
      version: version ?? existing.version,
      description: description ?? existing.description,
      screenshot: screenshot ?? existing.screenshot,
      config: config ?? existing.config,
      isActive: isActive !== undefined ? isActive : existing.isActive,
      sortOrder: sortOrder ?? existing.sortOrder,
    };
    if (isDefault !== undefined) data.isDefault = !!isDefault;

    const ops: any[] = [];

    // ① 设为默认时，取消其他模板的默认标记
    if (isDefault) {
      ops.push(prisma.template.updateMany({ where: { id: { not: id } }, data: { isDefault: false } }));
    }

    // ② 🔒 启用某模板时，**自动停用其他所有模板**（同一时刻只允许一个启用）
    //    2026-09-14 新增机制（用户需求）。放在服务端而非前端：
    //    无论从后台按钮、API 直调还是脚本触发，都保证「同一时刻只有一个启用」这一不变式。
    if (data.isActive === true) {
      ops.push(prisma.template.updateMany({ where: { id: { not: id } }, data: { isActive: false } }));
    }

    ops.push(prisma.template.update({ where: { id }, data }));
    await prisma.$transaction(ops);

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
