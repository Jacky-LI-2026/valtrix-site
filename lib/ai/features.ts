/**
 * AI 功能点注册表（AI Feature Registry / 开关矩阵）
 * =====================================================
 * 「每个功能也设置 AI 开关」：把全站可嵌入 AI 的具体功能点登记为开关项。
 * 三层开关控制任一 AI 功能点：
 *   1. 全局 AI 开关（ai_global_config.enabled）——总闸
 *   2. 归属 AI 插件族开关（ai-text / ai-translate / seo / ai-customer-service / ai-image ...）
 *   3. 功能点开关（ai_feature_state[key].enabled）——本功能点
 * 判断入口：aiFeatureEnabled(featureKey) → 三层全开才可用。
 * 存储：site_config.ai_feature_state（Json {key: {enabled, config}}）。
 */
import { PrismaClient } from '@/lib/generated/prisma';
import { aiCapabilityEnabled } from "@/lib/ai/gateway";

const prisma = new PrismaClient();
const CONFIG_KEY = "ai_feature_state";

export interface AiFeatureManifest {
  key: string;
  name: string;
  description: string;
  /** 归属 AI 插件族 key（ai-text / ai-translate / seo / ai-customer-service / ai-image / ai-autopilot） */
  pluginKey: string;
  category: "content" | "translate" | "seo" | "chat" | "image" | "autopilot";
  defaultEnabled: boolean;
  configFields?: { key: string; label: string; type: "text" | "select" | "boolean" | "number"; placeholder?: string; options?: { label: string; value: string }[] }[];
}

export const AI_FEATURE_CATEGORY_LABELS: Record<string, string> = {
  content: "内容创作",
  translate: "AI 翻译",
  seo: "SEO 增长",
  chat: "智能客服",
  image: "图像生成",
  autopilot: "自动运营",
};

export const BUILTIN_AI_FEATURES: AiFeatureManifest[] = [
  {
    key: "editor_generate",
    name: "AI 写文章",
    description: "内容编辑器/表单的「AI 生成」按钮：根据字段与提示词自动创作内容。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
    configFields: [
      { key: "maxTokens", label: "单次最大 Token", type: "number", placeholder: "1200" },
      { key: "temperature", label: "创造性（0-1）", type: "number", placeholder: "0.7" },
    ],
  },
  {
    key: "editor_polish",
    name: "AI 润色改写",
    description: "内容编辑器「润色/改写」按钮：优化措辞、增强专业性与可读性。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "editor_summary",
    name: "AI 摘要/SEO",
    description: "一键生成内容摘要、SEO 标题与关键词（GEO 智能填充）。",
    pluginKey: "ai-text",
    category: "seo",
    defaultEnabled: true,
  },
  {
    key: "spec_generate",
    name: "AI 生成技术规格",
    description: "产品编辑「AI 生成规格」：基于产品名/型号自动生成技术规格 JSON 数组（参数名/参数值/单位）。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "content_block_generate",
    name: "AI 生成内容块",
    description: "关于我们/服务详情「AI 生成内容块」：基于主题自动生成结构化内容块数组（heading/paragraph）。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "json_array_generate",
    name: "AI 生成数组项",
    description: "通用数组字段（JsonArrayEditor）「AI 生成」：基于字段结构与主题自动生成数组内容项。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "translate_auto",
    name: "AI 自动翻译",
    description: "全站自动翻译/一键翻译（多通道：DeepSeek / 百度 / 小牛 / MyMemory）。",
    pluginKey: "ai-translate",
    category: "translate",
    defaultEnabled: true,
  },
  {
    key: "seo_fill",
    name: "SEO/GEO 一键填充",
    description: "内容表单「SEO/GEO 配置」一键智能填充（标题/描述/关键词/地区）。",
    pluginKey: "seo",
    category: "seo",
    defaultEnabled: true,
  },
  {
    key: "chat_answer",
    name: "AI 客服问答",
    description: "前台 AI 客服对话（知识库 RAG + 大模型生成回答）。",
    pluginKey: "ai-customer-service",
    category: "chat",
    defaultEnabled: true,
  },
  {
    key: "image_placeholder",
    name: "AI 占位配图",
    description: "内容表单图片字段一键生成免费占位图；语义 AI 生图可接入第三方服务商。",
    pluginKey: "ai-image",
    category: "image",
    defaultEnabled: true,
  },
  {
    key: "collect_ai",
    name: "采集 AI 处理",
    description: "采集内容 AI 清洗/摘要/分类；驱动「AI 自动运营」流水线（草稿→补全→翻译→发布）。",
    pluginKey: "ai-autopilot",
    category: "autopilot",
    defaultEnabled: true,
  },
  {
    key: "backlink_writer",
    name: "外链发布文案",
    description: "外链管理页一键生成适配第三方平台（知乎/百家号/贴吧等）的软文/帖子文案，自动嵌入网站链接回链。",
    pluginKey: "ai-text",
    category: "content",
    defaultEnabled: true,
  },
];

export function getAiFeatureManifest(key: string): AiFeatureManifest | undefined {
  return BUILTIN_AI_FEATURES.find((f) => f.key === key);
}

/** 读取功能点开关状态 */
export async function getAiFeatureState(): Promise<Record<string, { enabled: boolean; config: Record<string, any> }>> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    return (row?.configValue as unknown as Record<string, { enabled: boolean; config: Record<string, any> }>) || {};
  } catch {
    return {};
  }
}

export async function saveAiFeatureState(state: Record<string, { enabled: boolean; config: Record<string, any> }>): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { configKey: CONFIG_KEY },
    update: { configValue: state as any },
    create: { configKey: CONFIG_KEY, configValue: state as any },
  });
}

/**
 * 功能点 AI 开关：全局 AI && 归属插件启用 && 功能点启用。
 * 功能点默认 enabled 取 manifest.defaultEnabled。
 */
export async function aiFeatureEnabled(featureKey: string): Promise<boolean> {
  const manifest = getAiFeatureManifest(featureKey);
  if (!manifest) return false;
  // 全局 AI + 归属插件
  const base = await aiCapabilityEnabled(manifest.pluginKey);
  if (!base) return false;
  // 功能点开关
  try {
    const state = await getAiFeatureState();
    const entry = state[featureKey];
    return entry ? !!entry.enabled : manifest.defaultEnabled;
  } catch {
    return manifest.defaultEnabled;
  }
}

/** 功能点级配置（合并 manifest 默认） */
export async function getAiFeatureConfig(featureKey: string): Promise<Record<string, any>> {
  const manifest = getAiFeatureManifest(featureKey);
  const state = await getAiFeatureState();
  return { ...(manifest?.configFields || []).reduce((a, f) => ({ ...a, [f.key]: undefined }), {}), ...(state[featureKey]?.config || {}) };
}
