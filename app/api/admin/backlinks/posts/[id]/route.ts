import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "published", "failed"] as const;

// PUT：更新软文（标题/正文/状态/发布地址）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (body.content !== undefined) {
      let content: any = {};
      if (typeof body.content === "string") {
        try { content = JSON.parse(body.content); } catch { content = { zh: body.content }; }
      } else if (body.content && typeof body.content === "object") {
        content = body.content;
      }
      data.content = content as any;
    }
    if (body.platform) data.platform = String(body.platform);
    if (body.platformType) data.platformType = String(body.platformType);
    if (body.publishUrl !== undefined) data.publishUrl = body.publishUrl || null;
    if (body.targetUrl !== undefined) data.targetUrl = body.targetUrl || null;
    if (body.status && STATUSES.includes(body.status)) {
      data.status = body.status;
      if (body.status === "published") data.publishedAt = new Date();
    }
    const item = await prisma.backlinkPost.update({ where: { id }, data });
    return NextResponse.json(serializeBigInt(item));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE：删除软文
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    await prisma.backlinkPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
