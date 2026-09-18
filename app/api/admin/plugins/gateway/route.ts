/**
 * 对外 API 网关 · 后台管理 API（Key 生成/删除/列表）
 * GET    /api/admin/plugins/gateway          → 列表 + 对外能力
 * POST   /api/admin/plugins/gateway          → { name } 创建 Key
 * DELETE /api/admin/plugins/gateway          → { key } 删除 Key
 */
import { NextRequest, NextResponse } from "next/server";
import { listGatewayKeys, createGatewayKey, revokeGatewayKey } from "@/lib/plugins/gateway-store";
import { listCapabilities } from "@/lib/plugins/capabilities";
import { ensurePlugins } from "@/lib/plugins/ensure";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  ensurePlugins();
  const keys = await listGatewayKeys();
  const caps = listCapabilities().filter((c) => c.public).map((c) => c.name);
  return NextResponse.json({ ok: true, keys, capabilities: caps });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim().slice(0, 50);
    const entry = await createGatewayKey(name);
    return NextResponse.json({ ok: true, key: entry.key, entry });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "创建失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const key = String(body?.key || "");
    if (!key) return NextResponse.json({ ok: false, error: "缺少 key" }, { status: 400 });
    const removed = await revokeGatewayKey(key);
    return NextResponse.json({ ok: true, removed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "删除失败" }, { status: 500 });
  }
}
