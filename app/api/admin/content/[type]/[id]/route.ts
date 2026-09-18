import { NextRequest, NextResponse } from "next/server";
import { getContentType } from "@/lib/content-types/registry";
import { resolveContentType } from "@/lib/content-types/dynamic";
import { contentService } from "@/lib/content-types/service";
import { auth } from "@/auth";
import { recordOperation } from "@/lib/operation-log";

/**
 * 统一后台内容 API · 单条详情 / 更新 / 删除
 * GET    /api/admin/content/[type]/[id]
 * PUT    /api/admin/content/[type]/[id]
 * DELETE /api/admin/content/[type]/[id]
 */
async function resolveCfg(type: string) {
  return (await resolveContentType(type)) || getContentType(type);
}

export async function GET(_req: NextRequest, { params }: { params: { type: string; id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = await resolveCfg(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  const item = await contentService.getById(params.type, params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { type: string; id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = await resolveCfg(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  try {
    const body = await req.json();
    const item = await contentService.update(params.type, params.id, body);
  await recordOperation({ module: "content:" + params.type, action: "update", target: String(params.id) });
    // 事件总线：内容更新发布 → SEO 推送等订阅者
    if (item?.status === "published" || body?.status === "published") {
      const { ensurePlugins } = await import("@/lib/plugins/ensure");
      ensurePlugins();
      const { emit } = await import("@/lib/plugins/events");
      emit("content.published", {
        type: params.type,
        id: params.id,
        slug: String(item?.slug ?? body?.slug ?? ""),
        title: String(body?.title ?? ""),
      });
    }
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { type: string; id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const cfg = await resolveCfg(params.type);
  if (!cfg) return NextResponse.json({ error: "Unknown content type" }, { status: 404 });
  try {
    await contentService.remove(params.type, params.id);
    await recordOperation({ module: "content:" + params.type, action: "delete", target: String(params.id) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 400 });
  }
}
