/**
 * 社媒发布「渠道配置 + 发布记录」存取
 * ==========================================================================
 * **不新增数据表**：整块状态存 `site_config.configKey = "social_publish"`（Json）。
 * 为什么：新增表要改 `prisma/schema.prisma`，而该文件在两站之间是**永不同步**的
 *   （双 fork 隔离），为一个插件动 schema + 两台服务器各自 db push，高风险低收益。
 *
 * 结构：
 *   { channels: { [id]: { enabled, config } }, log: SocialLogEntry[] }
 */
import { prisma } from "@/lib/prisma";

export const SOCIAL_CONFIG_KEY = "social_publish";
const LOG_LIMIT = 200;

export interface SocialChannelState {
  enabled: boolean;
  config: Record<string, string>;
}

export interface SocialLogEntry {
  at: string;
  channel: string;
  platform: string;
  contentType: string;
  contentId: string;
  title: string;
  ok: boolean;
  manual?: boolean;
  message: string;
}

export interface SocialState {
  channels: Record<string, SocialChannelState>;
  log: SocialLogEntry[];
}

export async function getSocialState(): Promise<SocialState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: SOCIAL_CONFIG_KEY } });
    const v = (row?.configValue as unknown as SocialState) || null;
    return { channels: v?.channels || {}, log: Array.isArray(v?.log) ? v.log : [] };
  } catch {
    return { channels: {}, log: [] };
  }
}

export async function saveSocialState(state: SocialState): Promise<void> {
  const value = { channels: state.channels || {}, log: (state.log || []).slice(0, LOG_LIMIT) } as any;
  await prisma.siteConfig.upsert({
    where: { configKey: SOCIAL_CONFIG_KEY },
    create: { configKey: SOCIAL_CONFIG_KEY, configValue: value },
    update: { configValue: value },
  });
}

/** 追加发布记录（保留最近 LOG_LIMIT 条） */
export async function appendSocialLog(entries: SocialLogEntry[]): Promise<void> {
  if (!entries.length) return;
  const state = await getSocialState();
  state.log = [...entries, ...state.log].slice(0, LOG_LIMIT);
  await saveSocialState(state);
}
