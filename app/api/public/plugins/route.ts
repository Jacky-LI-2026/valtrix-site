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
    return NextResponse.json({ ok: true, enabled, state: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, enabled: [], state: {} }, { status: 500 });
  }
}
