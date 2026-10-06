/**
 * 公开插件状态 API（前台免登录）
 * GET /api/public/plugins → { ok, enabled: string[], state: { [key]: boolean } }
 * 供前台组件（视频播放器、智能推荐等）判断插件是否启用。
 * 合并 manifest.defaultEnabled 与 DB 存储状态。
 */
import { NextResponse } from "next/server";
import { getPluginState } from "@/lib/plugins/store";
import { BUILTIN_PLUGINS } from "@/lib/plugins/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stored = await getPluginState();
    const out: Record<string, boolean> = {};
    const enabled: string[] = [];
    for (const p of BUILTIN_PLUGINS) {
      const e = stored[p.key];
      const on = e ? !!e.enabled : !!p.defaultEnabled;
      out[p.key] = on;
      if (on) enabled.push(p.key);
    }
    // 补充 state 中可能存在的非内置插件
    for (const key of Object.keys(stored)) {
      if (!(key in out)) {
        out[key] = !!stored[key].enabled;
        if (stored[key].enabled) enabled.push(key);
      }
    }
    /**
     * 公开配置（**白名单**）：只放"给前台用的非敏感配置"，绝不整表下发
     * （`plugin_state` 里可能含 smtp/API key 等密钥）。
     * 目前只放 `product-selector` 的「选型维度改名/隐藏」——见 /admin/product-selector。
     */
    const PUBLIC_CONFIG_KEYS = ["product-selector"];
    const configs: Record<string, any> = {};
    for (const k of PUBLIC_CONFIG_KEYS) {
      const c = stored[k]?.config;
      if (c && typeof c === "object") configs[k] = c;
    }
    return NextResponse.json({ ok: true, enabled, state: out, configs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, enabled: [], state: {}, configs: {} }, { status: 500 });
  }
}
