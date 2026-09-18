import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PLATFORM_TYPES = ["zhihu", "baijiahao", "sohu", "toutiao", "tieba", "forum", "weibo", "other"] as const;
const STATUSES = ["draft", "published", "failed"] as const;

// GET：外链软文列表（?backlinkId= 过滤某条外链；?status= 过滤状态）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const backlinkId = searchParams.get("backlinkId");
    const status = searchParams.get("status");
    const where: any = {};
    if (backlinkId) where.backlinkId = BigInt(backlinkId);
    if (status && STATUSES.includes(status as any)) where.status = status;
    const items = await prisma.backlinkPost.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
    });
    return NextResponse.json(serializeBigInt(items));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST：手动创建软文
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.platform || !body.title) {
      return NextResponse.json({ error: "平台与标题不能为空" }, { status: 400 });
    }
    let content: any = {};
    if (typeof body.content === "string") {
      try { content = JSON.parse(body.content); } catch { content = { zh: body.content }; }
    } else if (body.content && typeof body.content === "object") {
      content = body.content;
    }
    const item = await prisma.backlinkPost.create({
      data: {
        backlinkId: body.backlinkId ? BigInt(body.backlinkId) : null,
        platform: String(body.platform),
        platformType: PLATFORM_TYPES.includes(body.platformType) ? body.platformType : "other",
        title: String(body.title),
        content: content as any,
        status: STATUSES.includes(body.status) ? body.status : "draft",
        publishUrl: body.publishUrl || null,
        targetUrl: body.targetUrl || null,
        aiGenerated: !!body.aiGenerated,
        publishedAt: body.status === "published" ? new Date() : null,
      },
    });
    return NextResponse.json(serializeBigInt(item));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
