import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPluginActivated, savePluginActivated, verifyPluginCode } from "@/lib/plugins/market";
import { getMarketManifest } from "@/lib/plugins/registry";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/plugin-market/activate
 * 付费插件开通：输入兑换码（HMAC-SHA256 签名，base64url(payload).base64url(signature)），
 * 校验通过后将插件 key 加入 site_config.plugin_activated（已开通付费插件列表）。
 * 校验失败返回 400 + 错误信息。
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
    const { key, code } = body || {};
    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: false, error: "缺少插件 key" }, { status: 400 });
    }
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ ok: false, error: "请输入兑换码" }, { status: 400 });
    }
    const manifest = getMarketManifest(key.trim());
    if (!manifest) {
      return NextResponse.json({ ok: false, error: "市场目录中不存在该插件" }, { status: 404 });
    }
    const v = verifyPluginCode(code.trim(), key.trim());
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error || "兑换码无效" }, { status: 400 });
    }
    const list = await getPluginActivated();
    if (!list.includes(key.trim())) {
      list.push(key.trim());
      await savePluginActivated(list);
    }
    return NextResponse.json({ ok: true, key: key.trim() });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "开通失败" }, { status: 500 });
  }
}
