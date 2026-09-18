/**
 * 插件状态存取（Plugin Store）
 * =====================================================
 * 启用状态 + 配置统一存 site_config.plugin_state（Json），
 * 结构：{ [key]: { enabled: boolean, config: Record<string,any> } }
 */
import { prisma } from "@/lib/prisma";
import { BUILTIN_PLUGINS, getPluginManifest } from "./registry";

export interface PluginEntry {
  enabled: boolean;
  config: Record<string, any>;
  /** 自定义名称（覆盖 manifest.name，供侧边栏/能力市场显示） */
  name?: string;
  /** 是否显示在左侧菜单栏（默认 true，仅对已启用插件生效） */
  showInSidebar?: boolean;
  /** 安装时间（市场安装的插件记录；内置插件首次启停也会落库，但不强制） */
  installedAt?: string;
  /** 市场来源标记（builtin/remote），随安装记录持久化 */
  marketSource?: "remote" | "builtin";
  /** 市场价（元），随安装记录持久化 */
  price?: number;
}

const CONFIG_KEY = "plugin_state";

/** 读取全部插件状态（含默认值） */
export async function getPluginState(): Promise<Record<string, PluginEntry>> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    return (row?.configValue as unknown as Record<string, PluginEntry>) || {};
  } catch {
    return {};
  }
}

/** 保存插件状态 */
export async function savePluginState(state: Record<string, PluginEntry>): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { configKey: CONFIG_KEY },
    create: { configKey: CONFIG_KEY, configValue: state as any },
    update: { configValue: state as any },
  });
}

/** 插件是否启用（默认取 manifest.defaultEnabled） */
export async function isPluginEnabled(key: string): Promise<boolean> {
  const man = getPluginManifest(key);
  if (!man) return false;
  const state = await getPluginState();
  const entry = state[key];
  return entry ? !!entry.enabled : man.defaultEnabled;
}

/** 取插件配置（合并默认） */
export async function getPluginConfig(key: string): Promise<Record<string, any>> {
  const state = await getPluginState();
  return state[key]?.config || {};
}

/** 合并已启用插件集合（服务端多处复用） */
export async function listEnabledPlugins(): Promise<string[]> {
  const state = await getPluginState();
  return BUILTIN_PLUGINS.filter((p) => {
    const e = state[p.key];
    return e ? !!e.enabled : p.defaultEnabled;
  }).map((p) => p.key);
}

/**
 * 切换插件启用状态并触发生命周期 hooks（onEnable / onDisable）。
 * @returns { enabled, hooksOk } hooksOk=false 表示生命周期回调执行失败（状态已保存，仅告警）。
 */
export async function togglePlugin(key: string): Promise<{ enabled: boolean; hooksOk: boolean }> {
  const manifest = getPluginManifest(key);
  const state = await getPluginState();
  const initialEnabled = manifest ? manifest.defaultEnabled : false;
  const entry: PluginEntry = state[key] || { enabled: initialEnabled, config: {} };
  const previous = !!entry.enabled;
  entry.enabled = !entry.enabled;
  state[key] = entry;
  await savePluginState(state);

  // 触发生命周期（加载 hooks 模块，避免循环依赖）
  const { runPluginHook } = await import("./hooks");
  const phase = entry.enabled ? "onEnable" : "onDisable";
  const hooksOk = await runPluginHook(key, phase, { previous, next: !!entry.enabled, config: entry.config || {} });
  return { enabled: !!entry.enabled, hooksOk };
}

/**
 * 保存插件配置并触发 onConfigChange 生命周期。
 */
export async function setPluginConfig(key: string, config: Record<string, any>): Promise<{ config: Record<string, any>; hooksOk: boolean }> {
  const manifest = getPluginManifest(key);
  const state = await getPluginState();
  const initialEnabled = manifest ? manifest.defaultEnabled : true;
  const entry: PluginEntry = state[key] || { enabled: initialEnabled, config: {} };
  entry.config = config || {};
  state[key] = entry;
  await savePluginState(state);

  const { runPluginHook } = await import("./hooks");
  const hooksOk = await runPluginHook(key, "onConfigChange", { previous: !!entry.enabled, next: !!entry.enabled, config: entry.config || {} });
  return { config: entry.config, hooksOk };
}
