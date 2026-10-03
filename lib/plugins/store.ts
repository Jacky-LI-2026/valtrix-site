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
  /**
   * 记录该插件**最近一次被写入状态时**的 manifest 版本（2026-09-18 新增）。
   *
   * 为什么需要：目录版本在代码里（`manifest.version`），而状态在数据库里，两者原本没有任何关联
   *   ⇒ 插件升级/改名后，后台无法判断"这个站点装的是哪个版本"。
   * 现在：安装与每次启停/改配置都会把当前 manifest 版本写进来，后台可据此提示版本不一致。
   * ⚠️ 不是"已安装版本"的权威记录（没有真正的包管理），只是**上次状态变更时看到的版本**。
   */
  version?: string;
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

/*
 * 说明（2026-09-05 死代码清理）：
 * 原 togglePlugin() / setPluginConfig() 已删除——两者在仓库内零调用点，
 * 唯一实现该逻辑的是 app/api/admin/plugins/route.ts 的 POST action=toggle|config 与 PUT，
 * 且 route 版本带完整的鉴权与错误处理。保留两份实现会导致 hooks 触发语义分叉。
 */
