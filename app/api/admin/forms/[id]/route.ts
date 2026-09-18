/**
 * 通用表单 · 管理 API（单条）
 * PUT /api/admin/forms/[id] 更新
 * DELETE /api/admin/forms/[id] 删除
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.slug !== undefined) {
      data.slug = String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.fields !== undefined) data.fields = body.fields;
    if (body.submitLabel !== undefined) data.submitLabel = body.submitLabel;
    if (body.status !== undefined) data.status = body.status;
    const updated = await prisma.formDefinition.update({ where: { id }, data });
    return NextResponse.json(serializeBigInt(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    await prisma.formDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
