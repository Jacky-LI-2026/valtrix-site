/**
 * 插件 SDK（Plugin SDK）统一入口
 * =====================================================
 * R1 基座沉淀：把「插件声明 → 启停 → 能力 → 事件 → 生命周期」收敛为单一 SDK，
 * 供内置插件与未来第三方插件统一使用，形成「装即用、卸即走」的插件规范。
 *
 * 插件 = manifest（registry）+ hooks（hooks.ts）+ capabilities（capabilities.ts）+ events（events.ts）
 * 四件套统一注册/调用：
 *   definePlugin({ manifest, hooks, capabilities, events })
 *
 * 典型用法（在 lib/plugins/ 下新增插件族时）：
 *   import { definePlugin, getPluginConfig, isPluginEnabled, callCapability } from "./sdk";
 *   definePlugin({
 *     manifest: { key: "my-plugin", name: "...", ... },
 *     hooks: { onEnable: async () => {}, onDisable: async () => {} },
 *     capabilities: [ { name: "my.action", handler: async (args) => {} } ],
 *     events: [ { event: "content.published", listener: async () => {} } ],
 *   });
 */
export {
  BUILTIN_PLUGINS,
  PLUGIN_CATEGORY_LABELS,
  getPluginManifest,
} from "./registry";
export type {
  PluginManifest,
  PluginCategory,
  PluginConfigField,
} from "./registry";
export {
  registerPluginHooks,
  getPluginHooks,
  hasPluginHooks,
  runPluginHook,
  listHookedPlugins,
} from "./hooks";
export type { PluginHooks, PluginHookContext } from "./hooks";
export {
  registerCapability,
  callCapability,
  isPublicCapability,
  listCapabilities,
} from "./capabilities";
export {
  on as onEvent,
  off as offEvent,
  emit as emitEvent,
  listEvents,
} from "./events";
export {
  getPluginState,
  savePluginState,
  isPluginEnabled,
  getPluginConfig,
  listEnabledPlugins,
} from "./store";
export type { PluginEntry } from "./store";
export { registerBuiltinCapabilities, PLUGIN_EVENTS } from "./boot";
export { ensurePlugins } from "./ensure";

import type { PluginManifest } from "./registry";
import type { PluginHooks } from "./hooks";
import { getPluginManifest } from "./registry";
import { registerPluginHooks } from "./hooks";
import { registerCapability } from "./capabilities";
import { on } from "./events";

export interface PluginCapabilityDef {
  /** 能力名（<domain>.<action>，如 translate.text） */
  name: string;
  /** 是否对外开放（可被 /api/integration/[capability] 调用） */
  public?: boolean;
  handler: (args: any, ctx?: any) => Promise<any> | any;
}

export interface PluginEventSub {
  /** 事件名（如 content.published） */
  event: string;
  listener: (payload: any) => Promise<void> | void;
}

export interface PluginDefinition {
  /** 插件 manifest（key 唯一） */
  manifest: PluginManifest;
  /** 生命周期 hooks（可选） */
  hooks?: PluginHooks;
  /** 能力注册（可选） */
  capabilities?: PluginCapabilityDef[];
  /** 事件订阅（可选） */
  events?: PluginEventSub[];
}

/**
 * 定义/注册一个插件：统一注册 manifest 校验 + hooks + capabilities + events。
 * 若 manifest 已存在于 BUILTIN_PLUGINS（内置插件），则 manifest 以内置为准（仅合并 hooks/capabilities/events）。
 * 返回是否完成注册。
 */
export function definePlugin(def: PluginDefinition): boolean {
  if (!def?.manifest?.key) throw new Error("[plugin-sdk] definePlugin 缺少 manifest.key");
  const existing = getPluginManifest(def.manifest.key);
  if (!existing) {
    console.warn(`[plugin-sdk] 插件 ${def.manifest.key} 未在 registry 登记 manifest，仅注册 hooks/capabilities/events`);
  }
  if (def.hooks) registerPluginHooks(def.manifest.key, def.hooks);
  for (const cap of def.capabilities || []) {
    registerCapability(cap.name, cap.handler, { public: cap.public });
  }
  for (const ev of def.events || []) {
    on(ev.event, ev.listener);
  }
  return true;
}
