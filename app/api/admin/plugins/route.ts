import { NextRequest, NextResponse } from "next/server";
import { BUILTIN_PLUGINS, MARKET_EXAMPLE_PLUGINS, PLUGIN_CATEGORY_LABELS, getMarketManifest } from "@/lib/plugins/registry";
import { getPluginState, savePluginState, PluginEntry, listEnabledPlugins } from "@/lib/plugins/store";
import { isPluginActivated } from "@/lib/plugins/market";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/** GET：插件列表（manifest + 状态）；?mode=enabled 返回已启用插件的侧边栏元数据 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("mode") === "enabled") {
    const state = await getPluginState();
    // 侧边栏用：key + 自定义名称 + 是否显示在侧边栏 + 入口信息（仅已启用；含已安装的远程市场插件）
    // 侧边栏据此动态生成插件菜单项：有 adminUrls（多个二级页）→ 父菜单+子项；仅 adminUrl → 单入口
    const installedRemote = MARKET_EXAMPLE_PLUGINS.filter((p) => state[p.key]);
    const enabled = [...BUILTIN_PLUGINS, ...installedRemote].filter((p) => {
      const e = state[p.key];
      return e ? !!e.enabled : p.defaultEnabled;
    }).map((p) => {
      const e = state[p.key];
      return {
        key: p.key,
        name: e?.name || p.name,
        showInSidebar: e ? e.showInSidebar !== false : true,
        adminUrl: p.adminUrl || null,
        adminUrls: p.adminUrls || null,
        isContentSection: !!p.isContentSection,
        planned: !!p.planned,
        category: p.category,
      };
    });
    return NextResponse.json({ ok: true, enabled });
  }
  const state = await getPluginState();
  const installedRemote = MARKET_EXAMPLE_PLUGINS.filter((p) => state[p.key]);
  const list = [...BUILTIN_PLUGINS, ...installedRemote].map((p) => {
    const entry = state[p.key];
    return {
      ...p,
      enabled: entry ? !!entry.enabled : p.defaultEnabled,
      config: entry?.config || {},
      name: entry?.name || p.name,
      showInSidebar: entry ? entry.showInSidebar !== false : true,
      installedAt: entry?.installedAt || undefined,
      marketSource: entry?.marketSource || p.marketSource || (p.builtin ? "builtin" : undefined),
      categoryLabel: PLUGIN_CATEGORY_LABELS[p.category],
    };
  });
  return NextResponse.json({ ok: true, list, categories: PLUGIN_CATEGORY_LABELS });
}

/** POST：切换启停 / 保存配置 / 修改插件元信息。body: { action: "toggle"|"config"|"meta", key, config?, name?, showInSidebar? } */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { action, key } = body || {};
    if (!key) return NextResponse.json({ ok: false, error: "缺少插件 key" }, { status: 400 });
    const state = await getPluginState();
    // 初始状态与 GET 一致：取 manifest.defaultEnabled，而非硬编码 false（否则首次 toggle 错位）
    const manifest = getMarketManifest(key);
    const initialEnabled = manifest ? manifest.defaultEnabled : false;
    const entry: PluginEntry = state[key] || { enabled: initialEnabled, config: {} };

    if (action === "toggle") {
      // 付费插件未开通 → 拒绝启停（市场侧 UI 已锁定，此处为 API 层兜底防御）
      if (manifest?.paid) {
        const activated = await isPluginActivated(key);
        if (!activated) {
          return NextResponse.json({ ok: false, error: "该付费插件未开通，请先在插件市场输入兑换码开通" }, { status: 403 });
        }
      }
      // 走带生命周期 hooks 的切换（onEnable / onDisable）
      const prevEnabled = !!entry.enabled;
      entry.enabled = !prevEnabled;
      state[key] = entry;
      await savePluginState(state);
      const { runPluginHook } = await import("@/lib/plugins/hooks");
      const phase = entry.enabled ? "onEnable" : "onDisable";
      const hooksOk = await runPluginHook(key, phase, { previous: prevEnabled, next: !!entry.enabled, config: entry.config || {} });
      return NextResponse.json({ ok: true, entry, hooksOk });
    } else if (action === "config") {
      entry.config = body.config || {};
      state[key] = entry;
      await savePluginState(state);
      const { runPluginHook } = await import("@/lib/plugins/hooks");
      const hooksOk = await runPluginHook(key, "onConfigChange", { previous: !!entry.enabled, next: !!entry.enabled, config: entry.config || {} });
      return NextResponse.json({ ok: true, entry, hooksOk });
    } else if (action === "meta") {
      // 名称可留空 = 恢复默认名；showInSidebar 缺省不修改
      if (typeof body.name === "string") entry.name = body.name.trim() || undefined;
      if (typeof body.showInSidebar === "boolean") entry.showInSidebar = body.showInSidebar;
      state[key] = entry;
      await savePluginState(state);
      return NextResponse.json({ ok: true, entry });
    } else {
      return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "操作失败" }, { status: 500 });
  }
}

/** PUT：保存配置（等价 POST config，路由更语义化）——同样触发 onConfigChange */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { key, config } = body || {};
    if (!key) return NextResponse.json({ ok: false, error: "缺少插件 key" }, { status: 400 });
    const state = await getPluginState();
    const manifest = getMarketManifest(key);
    const initialEnabled = manifest ? manifest.defaultEnabled : true;
    const entry: PluginEntry = state[key] || { enabled: initialEnabled, config: {} };
    entry.config = config || {};
    state[key] = entry;
    await savePluginState(state);
    const { runPluginHook } = await import("@/lib/plugins/hooks");
    const hooksOk = await runPluginHook(key, "onConfigChange", { previous: !!entry.enabled, next: !!entry.enabled, config: entry.config || {} });
    return NextResponse.json({ ok: true, entry, hooksOk });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "保存失败" }, { status: 500 });
  }
}
