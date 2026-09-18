/**
 * AI 自动运营（AI Autopilot）
 * =====================================================
 * 流水线：取内容类型草稿（静态类型 + 动态类型）→ AI 补全中文 + AI 翻译目标语种 → 按配置发布 → 百度推送。
 * 依赖：ai-autopilot 插件启用 + 全局 AI。
 * 存储：site_config.ai_autopilot_config（Json {types[], targetLangs, autoPublish, maxPerRun, schedule, scheduleEnabled}）。
 * 运行日志：site_config.autopilot_logs（Json 数组，保留最近 50 条）。
 * 定时调度：cronMatcher 由自定义 server（server.js）的 interval 每分钟 tick 触发。
 */
import { prisma } from "@/lib/prisma";
import { callAiText } from "@/lib/ai/gateway";
import { getDynamicType } from "@/lib/content-types/dynamic";
import { getContentType, getMultiLangKeys } from "@/lib/content-types/registry";
import { contentService } from "@/lib/content-types/service";

const CONFIG_KEY = "ai_autopilot_config";
const LOG_KEY = "autopilot_logs";

export interface AutoPilotConfig {
  types: string[];
  targetLangs: string[];
  autoPublish: boolean;
  maxPerRun: number;
  schedule: string;          // cron 5 字段：分 时 日 月 周
  scheduleEnabled: boolean;
}

export const DEFAULT_AUTOPILOT: AutoPilotConfig = {
  types: ["products", "news"],
  targetLangs: ["en", "ja"],
  autoPublish: false,
  maxPerRun: 5,
  schedule: "0 2 * * *",
  scheduleEnabled: false,
};

const LANG_NAMES: Record<string, string> = { zh: "中文", en: "英文", ja: "日文", ko: "韩文", fr: "法文", ar: "阿拉伯文" };
const LANG_SUFFIX: Record<string, string> = { zh: "", en: "En", ja: "Ja", ko: "Ko", fr: "Fr", ar: "Ar" };
const TEXT_KINDS = new Set(["text", "textarea", "richtext"]);
export const ALL_AUTOPILOT_TYPES = ["products", "news", "services", "industries", "case", "faq"];

export async function getAutopilotConfig(): Promise<AutoPilotConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    const v = row?.configValue as any;
    if (v && typeof v === "object") {
      const cur = { ...DEFAULT_AUTOPILOT, ...v } as any;
      if (!Array.isArray(cur.types)) cur.types = [cur.type || v.type || DEFAULT_AUTOPILOT.types[0]];
      return cur;
    }
    if (typeof v === "string") {
      try {
        const cur = { ...DEFAULT_AUTOPILOT, ...JSON.parse(v) } as any;
        if (!Array.isArray(cur.types)) cur.types = [cur.type || cur.types?.[0] || DEFAULT_AUTOPILOT.types[0]];
        return cur;
      } catch { /* ignore */ }
    }
    return { ...DEFAULT_AUTOPILOT };
  } catch {
    return { ...DEFAULT_AUTOPILOT };
  }
}

export async function saveAutopilotConfig(input: Partial<AutoPilotConfig>): Promise<AutoPilotConfig> {
  const cur = await getAutopilotConfig();
  const next: any = { ...cur, ...input };
  if (Array.isArray(next.types)) next.types = next.types.filter((x: string) => x);
  else if (typeof next.type === "string") next.types = [next.type];
  if (!Array.isArray(next.targetLangs)) next.targetLangs = DEFAULT_AUTOPILOT.targetLangs;
  next.targetLangs = next.targetLangs.filter((x: string) => x && x !== "zh");
  next.maxPerRun = Math.min(Math.max(Number(next.maxPerRun) || 5, 1), 20);
  next.schedule = next.schedule || DEFAULT_AUTOPILOT.schedule;
  next.scheduleEnabled = !!next.scheduleEnabled;
  delete next.type;
  await prisma.siteConfig.upsert({
    where: { configKey: CONFIG_KEY },
    update: { configValue: next as any },
    create: { configKey: CONFIG_KEY, configValue: next as any },
  });
  return next;
}

export interface AutopilotResult {
  type: string;
  processed: number;
  published: number;
  updated: number;
  skipped: number;
  errors: number;
  results: { id: string; title: string; status: string; error?: string }[];
}

/** 追加运行日志（保留最近 50 条） */
export async function appendAutopilotLog(entry: any): Promise<void> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: LOG_KEY } });
    let logs: any[] = [];
    const v = row?.configValue as any;
    if (Array.isArray(v)) logs = v;
    else if (typeof v === "string") { try { logs = JSON.parse(v) || []; } catch { logs = []; } }
    logs.unshift({ ts: new Date().toISOString(), ...entry });
    if (logs.length > 50) logs = logs.slice(0, 50);
    await prisma.siteConfig.upsert({
      where: { configKey: LOG_KEY },
      update: { configValue: logs as any },
      create: { configKey: LOG_KEY, configValue: logs as any },
    });
  } catch { /* ignore */ }
}

export async function getAutopilotLogs(limit = 30): Promise<any[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: LOG_KEY } });
    const v = row?.configValue as any;
    if (Array.isArray(v)) return v.slice(0, limit);
    if (typeof v === "string") { try { return (JSON.parse(v) || []).slice(0, limit); } catch { return []; } }
    return [];
  } catch { return []; }
}

/** 运行一轮自动运营（覆盖全部静态 + 动态类型） */
export async function runAutopilot(overrides?: Partial<AutoPilotConfig>): Promise<AutopilotResult[]> {
  const cfg = { ...(await getAutopilotConfig()), ...(overrides || {}) };
  if (!Array.isArray(cfg.types) || cfg.types.length === 0) throw new Error("未配置自动运营内容类型");

  const allResults: AutopilotResult[] = [];
  for (const type of cfg.types) {
    try {
      const r = await runAutopilotForType(type, cfg);
      allResults.push(r);
    } catch (e: any) {
      allResults.push({ type, processed: 0, published: 0, updated: 0, skipped: 0, errors: 1, results: [{ id: "", title: type, status: "error", error: e?.message || String(e) }] });
    }
  }

  const sum = allResults.reduce((acc, r) => ({
    processed: acc.processed + r.processed,
    published: acc.published + r.published,
    updated: acc.updated + r.updated,
    skipped: acc.skipped + r.skipped,
    errors: acc.errors + r.errors,
  }), { processed: 0, published: 0, updated: 0, skipped: 0, errors: 0 });

  await appendAutopilotLog({
    types: cfg.types,
    targetLangs: cfg.targetLangs,
    autoPublish: cfg.autoPublish,
    ...sum,
  });
  return allResults;
}

async function runAutopilotForType(type: string, cfg: AutoPilotConfig): Promise<AutopilotResult> {
  const isDynamic = !!(await getDynamicType(type).catch(() => null));
  const out: AutopilotResult = { type, processed: 0, published: 0, updated: 0, skipped: 0, errors: 0, results: [] };
  const limit = Math.min(cfg.maxPerRun || 5, 20);

  if (isDynamic) {
    // ===== 动态类型（dynamicContent，fields 对象式 {zh,en,...}）=====
    const drafts = await prisma.dynamicContent.findMany({
      where: { type, status: "draft" },
      orderBy: { id: "asc" },
      take: limit,
    });
    const typeDef = await getDynamicType(type);
    const textFields = (typeDef?.fields || []).filter((f: any) => f.multiLang && TEXT_KINDS.has(f.kind));
    out.processed = drafts.length;

    for (const item of drafts) {
      try {
        const fields = ((item.fields || {}) as Record<string, any>);
        let changed = false;
        for (const f of textFields) {
          const raw = fields[f.name];
          const obj = raw && typeof raw === "object" ? { ...raw } : { zh: raw || "" };
          if (!obj.zh || !String(obj.zh).trim()) {
            const gen = await callAiText(`你是企业官网内容编辑。请为「${f.label}」撰写专业、通顺的中文内容（主题：${item.title}，80-150字，纯文本）。`);
            if (gen) { obj.zh = gen; changed = true; }
          }
          const srcZh = String(obj.zh || "");
          for (const lang of cfg.targetLangs) {
            if ((!obj[lang] || !String(obj[lang]).trim()) && srcZh) {
              const translated = await callAiText(`请把以下内容翻译成${LANG_NAMES[lang] || lang}，只输出译文，不要任何解释或标号：\n\n${srcZh}`);
              if (translated) { obj[lang] = translated; changed = true; }
            }
          }
          fields[f.name] = obj;
        }
        if (!changed) {
          out.skipped++;
          out.results.push({ id: String(item.id), title: item.title, status: "skipped" });
          continue;
        }
        const publish = !!cfg.autoPublish;
        const next = await prisma.dynamicContent.update({
          where: { id: item.id },
          data: { fields, status: publish ? "published" : "draft", publishedAt: publish ? new Date() : item.publishedAt },
        });
        if (publish) { out.published++; try { await pushUrl(type, next.slug || ""); } catch { /* ignore */ } }
        else out.updated++;
        out.results.push({ id: String(item.id), title: item.title, status: publish ? "published" : "updated" });
      } catch (e: any) {
        out.errors++;
        out.results.push({ id: String(item.id), title: item.title, status: "error", error: e?.message || String(e) });
      }
    }
    return out;
  }

  // ===== 静态类型（独立模型，后缀式多语言列 name/nameEn/...）=====
  const cfgType = getContentType(type);
  if (!cfgType) { out.errors = 1; out.results.push({ id: "", title: type, status: "error", error: "未知内容类型" }); return out; }

  const drafts: any[] = await contentService.list(type, { all: true, status: "draft" });
  out.processed = drafts.length;

  for (const item of drafts.slice(0, limit)) {
    try {
      const textFields = cfgType.fields.filter((f: any) => f.multiLang && TEXT_KINDS.has(f.kind));
      const data: any = {};
      let changed = false;

      for (const f of textFields) {
        const base = f.name;
        const zh = String(item[base] ?? "");
        if (!zh.trim()) {
          const gen = await callAiText(`你是企业官网内容编辑。请为「${f.label}」撰写专业、通顺的中文内容（主题：${item.title || item.name || ""}，80-150字，纯文本）。`);
          if (gen) { data[base] = gen; changed = true; }
        }
        for (const lang of cfg.targetLangs) {
          const suf = LANG_SUFFIX[lang];
          const col = suf ? base + suf : base;
          const cur = String(item[col] ?? "");
          const src = String(data[base] ?? zh);
          if (!cur.trim() && src.trim()) {
            const translated = await callAiText(`请把以下内容翻译成${LANG_NAMES[lang] || lang}，只输出译文，不要任何解释或标号：\n\n${src}`);
            if (translated) { data[col] = translated; changed = true; }
          }
        }
      }

      if (!changed) {
        out.skipped++;
        out.results.push({ id: String(item.id), title: item.title || item.name || String(item.id), status: "skipped" });
        continue;
      }

      const publish = !!cfg.autoPublish;
      if (publish) data.status = "published";
      await contentService.update(type, String(item.id), data);
      if (publish) { out.published++; try { await pushUrl(type, item.slug || ""); } catch { /* ignore */ } }
      else out.updated++;
      out.results.push({ id: String(item.id), title: item.title || item.name || String(item.id), status: publish ? "published" : "updated" });
    } catch (e: any) {
      out.errors++;
      out.results.push({ id: String(item.id), title: item.title || item.name || String(item.id), status: "error", error: e?.message || String(e) });
    }
  }
  return out;
}

/** 简单 cron 匹配（5 字段：分 时 日 月 周，支持 *、数字、逗号列表、步进写法） */
export function cronMatch(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const week = date.getDay();
  const values = [minute, hour, day, month, week];
  for (let i = 0; i < 5; i++) {
    if (!matchPart(parts[i], values[i])) return false;
  }
  return true;
}

function matchPart(part: string, value: number): boolean {
  if (part === "*") return true;
  for (const seg of part.split(",")) {
    const s = seg.trim();
    if (!s) continue;
    if (s.startsWith("*/")) {
      const step = parseInt(s.slice(2), 10);
      if (step && value % step === 0) return true;
      continue;
    }
    if (s.includes("-")) {
      const [a, b] = s.split("-").map((x) => parseInt(x, 10));
      if (!isNaN(a) && !isNaN(b) && value >= a && value <= b) return true;
      continue;
    }
    if (parseInt(s, 10) === value) return true;
  }
  return false;
}

/** 定时检查：由 server.js 每分钟调用。到点且配置开启则执行一轮 */
export async function autopilotScheduleTick(): Promise<boolean> {
  try {
    const cfg = await getAutopilotConfig();
    if (!cfg.scheduleEnabled) return false;
    const now = new Date();
    if (!cronMatch(cfg.schedule, now)) return false;
    // 避免重复执行：标记最近执行分钟（内存缓存）
    const lastRunKey = "autopilot_last_minute";
    const g = globalThis as any;
    if (g[lastRunKey] === now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "-" + now.getHours() + "-" + now.getMinutes()) return false;
    g[lastRunKey] = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "-" + now.getHours() + "-" + now.getMinutes();
    await runAutopilot();
    return true;
  } catch { return false; }
}

/** 百度推送 */
async function pushUrl(type: string, slug: string): Promise<void> {
  try {
    const { getSiteBaseUrl, pushUrlsToBaidu } = await import("@/lib/seo/baidu-push");
    const base = await getSiteBaseUrl();
    if (!base || !slug) return;
    await pushUrlsToBaidu([`${base}/content/${type}/${slug}`]);
  } catch { /* 忽略 */ }
}
