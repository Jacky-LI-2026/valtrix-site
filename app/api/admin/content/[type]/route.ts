import { NextRequest, NextResponse } from "next/server";
import { getContentType } from "@/lib/content-types/registry";
import { resolveContentType } from "@/lib/content-types/dynamic";
import { contentService } from "@/lib/content-types/service";
import { auth } from "@/auth";

/**
 * 统一后台内容 API · 列表 / 创建
 * GET  /api/admin/content/[type]?search=&status=
 * POST /api/admin/content/[type]
 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = (await resolveContentType(params.type)) || getContentType(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const items = await contentService.list(params.type, {
    search: sp.get("search") || undefined,
    status: sp.get("status") || undefined,
    all: true,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = (await resolveContentType(params.type)) || getContentType(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  try {
    const body = await req.json();
    const item = await contentService.create(params.type, body);
    // 事件总线：内容发布 → SEO 推送等订阅者
    if (item?.status === "published" || body?.status === "published") {
      const { ensurePlugins } = await import("@/lib/plugins/ensure");
      ensurePlugins();
      const { emit } = await import("@/lib/plugins/events");
      emit("content.published", {
        type: params.type,
        id: String(item?.id ?? ""),
        slug: String(item?.slug ?? body?.slug ?? ""),
        title: String(body?.title ?? ""),
      });
    }
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Create failed" }, { status: 400 });
  }
}
