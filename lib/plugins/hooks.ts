/**
 * 插件生命周期 Hooks（Plugin Lifecycle Hooks）
 * =====================================================
 * 插件启停 / 配置变更时的联动回调（onEnable / onDisable / onConfigChange / onInstall / onUninstall）。
 * - 用于：启用某插件时初始化默认配置/建表/注册能力，停用时清理入口、撤销监听，配置变更时重建下游依赖。
 * - 与事件总线（events.ts）的区别：hooks 是「该插件自身生命周期」的确定性回调，随启停/配置操作同步 await；
 *   事件总线是「系统内异步联动」（多个订阅者、fire-and-forget）。
 * - 与能力注册表（capabilities.ts）的区别：capabilities 是运行时服务能力（调用方无感），hooks 是插件自身的生命周期。
 *
 * 用法（在 lib/plugins/sdk.ts 的 registerPlugin 或独立注册）：
 *   registerPluginHooks('content-types', {
 *     onEnable: async (ctx) => { ... },
 *     onDisable: async (ctx) => { ... },
 *     onConfigChange: async (ctx) => { ... },
 *   });
 */
/* 说明（2026-09-05）：原 `import { PluginManifest }` 与 assertHookPlugin() 已一并删除——
   该函数仓库内零调用点；manifest 校验由 app/api/admin/plugins/route.ts 在 toggle/config 前完成。 */
export interface PluginHookContext {
  /** 插件 key */
  key: string;
  /** 启用前/停用前的状态（onEnable 为停用态、onDisable 为启用态） */
  previous: boolean;
  /** 变更后的状态 */
  next: boolean;
  /** 插件配置（onConfigChange 时为新配置） */
  config: Record<string, any>;
  /** 可选的运行时上下文（服务端注入） */
  [k: string]: any;
}

export interface PluginHooks {
  /** 启用后调用（幂等：可从停用态初始化） */
  onEnable?: (ctx: PluginHookContext) => Promise<void> | void;
  /** 停用后调用（清理前台入口/撤销监听） */
  onDisable?: (ctx: PluginHookContext) => Promise<void> | void;
  /** 配置变更后调用 */
  onConfigChange?: (ctx: PluginHookContext) => Promise<void> | void;
  /** 首次安装/初始化时调用（仅在从未存在状态记录时触发一次） */
  onInstall?: (ctx: PluginHookContext) => Promise<void> | void;
  /** 卸载（仅非内置插件）时调用 */
  onUninstall?: (ctx: PluginHookContext) => Promise<void> | void;
}

const hooksRegistry = new Map<string, PluginHooks>();

/** 注册某插件的生命周期 hooks（重复注册覆盖并告警） */
export function registerPluginHooks(key: string, hooks: PluginHooks): void {
  if (hooksRegistry.has(key)) {
    console.warn(`[plugin-hooks] 插件 ${key} hooks 重复注册，将覆盖`);
  }
  hooksRegistry.set(key, hooks);
}

/** 获取某插件已注册的 hooks（无则 undefined） */
export function getPluginHooks(key: string): PluginHooks | undefined {
  return hooksRegistry.get(key);
}

/** 判断插件是否已注册 hooks */
export function hasPluginHooks(key: string): boolean {
  return hooksRegistry.has(key);
}

/** 列出所有已注册 hooks 的插件 key */
export function listHookedPlugins(): string[] {
  return Array.from(hooksRegistry.keys());
}

/**
 * 触发指定生命周期回调（内部统一：封装 try/catch，单插件 hook 失败不阻断主流程）。
 * @returns 是否成功执行（无 hook 视为 true）
 */
export async function runPluginHook(
  key: string,
  phase: "onEnable" | "onDisable" | "onConfigChange" | "onInstall" | "onUninstall",
  ctx: Omit<PluginHookContext, "key">
): Promise<boolean> {
  const hooks = hooksRegistry.get(key);
  const fn = hooks?.[phase];
  if (!fn) return true;
  try {
    const fullCtx: PluginHookContext = {
      key,
      previous: ctx.previous,
      next: ctx.next,
      config: ctx.config || {},
      ...ctx,
    };
    await fn(fullCtx);
    return true;
  } catch (e) {
    console.error(`[plugin-hooks] 插件 ${key} ${phase} 执行失败:`, e);
    return false;
  }
}

/* 说明（2026-09-05）：原 assertHookPlugin() 已删除——仓库内零调用点，
   manifest 校验由 app/api/admin/plugins/route.ts 在 toggle/config 前自行完成。 */
