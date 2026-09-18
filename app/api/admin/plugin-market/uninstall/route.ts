import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uninstallMarketPlugin } from "@/lib/plugins/market";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/plugin-market/uninstall
 * 卸载市场插件：从 site_config.plugin_state 移除（仅远程安装的可卸载）。
 * builtin 插件不可卸载返回 400；未安装返回 404。
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { key } = body || {};
    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: false, error: "缺少插件 key" }, { status: 400 });
    }
    const r = await uninstallMarketPlugin(key.trim());
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: r.status || 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "卸载失败" }, { status: 500 });
  }
}
