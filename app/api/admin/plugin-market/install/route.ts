import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { installMarketPlugin } from "@/lib/plugins/market";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/plugin-market/install
 * 安装市场插件：持久化到 site_config.plugin_state（enabled=false + marketSource/price/installedAt）。
 * 安装后出现在插件启停列表（已安装管理视图）可启停；已安装返回 409。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D2）。
 * 权限：middleware 的 API_PERMISSION 已将其收口到 config:site。
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
    const r = await installMarketPlugin(key.trim());
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: r.status || 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "安装失败" }, { status: 500 });
  }
}
