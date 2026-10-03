import { NextRequest, NextResponse } from "next/server";
import { BUILTIN_PLUGINS, MARKET_EXAMPLE_PLUGINS, PLUGIN_CATEGORY_LABELS, getMarketManifest, resolvePluginMenuGroup } from "@/lib/plugins/registry";
import { getPluginState, savePluginState, PluginEntry, listEnabledPlugins } from "@/lib/plugins/store";
import { isPluginActivated } from "@/lib/plugins/market";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * 找出「当前启用、且声明依赖 `key`」的插件（供停用前阻断提示）。
 *
 * 依赖图来源 = manifest.dependencies（内置目录 + 市场示例目录）。
 * 2026-09-18 新增：`dependencies` 字段此前**只声明、从不校验**（界面上也 0 处展示），
 *   停用 `content-types` 这类"机制型"插件时，那些依赖它的栏目不会有任何提示。
 */
function collectEnabledDependents(
  key: string,
  state: Record<string, PluginEntry>
): { key: string; name: string }[] {
  return [...BUILTIN_PLUGINS, ...MARKET_EXAMPLE_PLUGINS]
    .filter((p) => p.key !== key && (p.dependencies || []).includes(key))
    .filter((p) => {
      const e = state[p.key];
      return e ? !!e.enabled : p.defaultEnabled;
    })
    .map((p) => ({ key: p.key, name: state[p.key]?.name || p.name }));
}

/** GET：插件列表（manifest + 状态）；?mode=enabled 返回已启用插件的侧边栏元数据 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("mode") === "enabled") {
    const state = await getPluginState();
    // 侧边栏用：key + 自定义名称 + 是否显示在侧边栏 + 入口信息（仅已启用）
    // 侧边栏据此动态生成插件菜单项：有 adminUrls（多个二级页）→ 父菜单+子项；仅 adminUrl → 单入口
    // 市场安装的远程插件（已写入 plugin_state）也要出现在侧边栏候选里，
    // 否则「安装后启用」的插件不会生成侧边栏入口
    const installedRemote = MARKET_EXAMPLE_PLUGINS.filter((p) => !!state[p.key]);
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
        // 2026-09-18 新增：侧边栏分组（按 category 推导，允许 manifest.menuGroup 覆盖）
        // 此前侧边栏把所有动态插件入口**统一塞进「能力市场」** ⇒ 商城/会员/询价都跑到"插件市场"里去了。
        menuGroup: resolvePluginMenuGroup(p),
        menuOrder: p.menuOrder ?? null,
      };
    });
    return NextResponse.json({ ok: true, enabled });
  }
  const state = await getPluginState();
  // 市场安装的远程插件（已写入 plugin_state）也要出现在插件列表里，
  // 否则「安装成功」的插件在插件管理页看不到、也无法启停
  const installedRemote = MARKET_EXAMPLE_PLUGINS.filter((p) => !!state[p.key]);
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
      // P1-2：上次状态变更时记录的目录版本（与 manifest.version 比对可提示"版本不一致"）
      installedVersion: entry?.version || undefined,
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
    // manifest 需同时覆盖内置与市场插件 —— 只查 BUILTIN_PLUGINS 会让市场插件取不到默认值
    const manifest = getMarketManifest(key) || BUILTIN_PLUGINS.find((p) => p.key === key);
    const initialEnabled = manifest ? manifest.defaultEnabled : false;
    const entry: PluginEntry = state[key] || { enabled: initialEnabled, config: {} };

    if (action === "toggle") {
      // 走带生命周期 hooks 的切换（onEnable / onDisable）
      const prevEnabled = !!entry.enabled;
      const nextEnabled = !prevEnabled;

      // 🔴 P1-3（2026-09-18）：**停用前做依赖阻断**。
      //   规则：被他人依赖的插件在停用时，若那些依赖方当前处于启用状态 ⇒ 返回 409 并列出它们。
      //   逃生通道：请求体带 `force: true` 时跳过校验（避免出现"想停却永远停不掉"）。
      if (prevEnabled && !nextEnabled && (body as any)?.force !== true) {
        const dependents = collectEnabledDependents(key, state);
        if (dependents.length > 0) {
          return NextResponse.json(
            {
              ok: false,
              error: `以下已启用插件依赖「${manifest?.name || key}」，请先停用它们：${dependents
                .map((d) => d.name)
                .join("、")}`,
              dependents,
            },
            { status: 409 }
          );
        }
      }

      entry.enabled = nextEnabled;
      // 记录"本次状态变更时看到的目录版本"，供后台提示版本不一致（P1-2）
      entry.version = manifest?.version ?? entry.version;
      state[key] = entry;
      await savePluginState(state);
      const { runPluginHook } = await import("@/lib/plugins/hooks");
      const phase = entry.enabled ? "onEnable" : "onDisable";
      const hooksOk = await runPluginHook(key, phase, { previous: prevEnabled, next: !!entry.enabled, config: entry.config || {} });
      return NextResponse.json({ ok: true, entry, hooksOk });
    } else if (action === "config") {
      entry.config = body.config || {};
      entry.version = manifest?.version ?? entry.version;
      state[key] = entry;
      await savePluginState(state);
      const { runPluginHook } = await import("@/lib/plugins/hooks");
      const hooksOk = await runPluginHook(key, "onConfigChange", { previous: !!entry.enabled, next: !!entry.enabled, config: entry.config || {} });
      return NextResponse.json({ ok: true, entry, hooksOk });
    } else if (action === "meta") {
      // 名称可留空 = 恢复默认名；showInSidebar 缺省不修改
      if (typeof body.name === "string") entry.name = body.name.trim() || undefined;
      if (typeof body.showInSidebar === "boolean") entry.showInSidebar = body.showInSidebar;
      entry.version = manifest?.version ?? entry.version;
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
    const manifest = getMarketManifest(key) || BUILTIN_PLUGINS.find((p) => p.key === key);
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
