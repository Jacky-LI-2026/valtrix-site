import { prisma } from "@/lib/prisma";

/**
 * 中国企业名称真实性核实（DeepSeek 判断）
 * - 仅对"中国企业名称"（含中文 + 公司标志词）触发核实
 * - exists=true 放行；false 阻止；null 无法确认（严格模式下阻止）
 */

export type VerifyResult = {
  verified: boolean;
  exists: boolean | null;
  confidence: string;
  reason: string;
  error?: string;
  fromCache?: boolean;
};

const cache = new Map<string, { result: VerifyResult; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟

/** 是否为"中国企业名称"（需核实） */
export function isChineseCompanyName(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  if (!/[\u4e00-\u9fa5]/.test(n)) return false; // 必须含中文
  return /公司|集团|股份|有限|厂|研究所|研究院|科技|实业|控股|工作室|商贸|贸易|工程|材料|设备|电子|半导体|光学|新能源|科技$/.test(n);
}

function parseConfig(v: any): any {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v || {};
}

/** 读取 AI 凭证（AI 全局配置 deepseekKey 优先，回退 AI 客服配置 / 翻译配置 / 环境变量） */
export async function getAiCredential(): Promise<{ key: string; baseUrl: string; model: string }> {
  try {
    const g = await prisma.siteConfig.findUnique({ where: { configKey: "ai_global_config" } });
    if (g) {
      const c = parseConfig(g.configValue);
      const key = c?.deepseekKey || c?.apiKey || c?.key || "";
      if (key) return { key, baseUrl: c?.baseUrl || "https://api.deepseek.com/v1", model: c?.deepseekModel || c?.model || "deepseek-chat" };
    }
  } catch {}
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "ai_chat_config" } });
    if (db) {
      const c = parseConfig(db.configValue);
      const key = c?.apiKey || c?.key || "";
      if (key) return { key, baseUrl: c?.baseUrl || "https://api.deepseek.com/v1", model: c?.model || "deepseek-chat" };
    }
  } catch {}
  try {
    const tc = await prisma.siteConfig.findUnique({ where: { configKey: "translate_config" } });
    if (tc) {
      const t = parseConfig(tc.configValue);
      if (t?.aiApiKey) return { key: t.aiApiKey, baseUrl: t.aiBaseUrl || "https://api.deepseek.com/v1", model: t.aiModel || "deepseek-chat" };
    }
  } catch {}
  return {
    key: process.env.AI_TRANSLATE_API_KEY || process.env.DEEPSEEK_API_KEY || "",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  };
}

/** 读取公司核实配置（site_config.company_verify_config）
 *  - enabled: 是否启用核实
 *  - strict:  严格模式——"无法确认"的公司也阻止提交（默认 false：仅拦截明确虚构/不存在的公司，
 *             无法确认的真实小公司放行以避免误伤，核实结果可由后台人工审核） */
export async function getCompanyVerifyConfig(): Promise<{ enabled: boolean; strict: boolean }> {
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "company_verify_config" } });
    if (db) {
      const c = parseConfig(db.configValue);
      return { enabled: c?.enabled !== false, strict: c?.strict === true };
    }
  } catch {}
  return { enabled: true, strict: false };
}

const SYS_PROMPT = [
  "你是中国企业工商信息核实助手。判断给定的公司名称是否为真实注册存在的中国企业。",
  "判定规则：",
  "1. 仅当你掌握的信息中明确包含该公司的真实工商注册或公开经营记录（上市公司、被权威媒体/百科/行业名录收录等）时，判定为“存在”。",
  "2. 明显属于虚构、测试、占位、拼凑或恶意构造的名称（如“张三虚构科技”“测试测试科技”“随便写个公司”等）判定为“不存在”。",
  "3. 你无法确认时判定为“无法确认”，不要猜测，不要因礼貌或迎合而把不确定的公司判为存在。宁可严格，不得放行无法确认的公司。",
  "4. 仅针对中国企业名称；不含中文公司特征的名称为其他情况，不适用本判定。",
  "只输出一行 JSON，格式：{\"exists\": true|false|null, \"confidence\": \"high|medium|low\", \"reason\": \"一句话理由\"}",
  "exists=true 表示确定存在；false 表示确定不存在或明显虚构；null 表示无法确认。",
].join("\n");

/** 核实中国企业名称 */
export async function verifyChineseCompany(name: string): Promise<VerifyResult> {
  const key = name.trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ...cached.result, fromCache: true };
  }

  const { key: apiKey, baseUrl, model } = await getAiCredential();
  if (!apiKey) {
    return { verified: false, exists: null, confidence: "low", reason: "公司核实服务未配置" };
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYS_PROMPT },
          { role: "user", content: key },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const m = content.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    try { parsed = m ? JSON.parse(m[0]) : null; } catch {}
    const exists = parsed?.exists === true ? true : parsed?.exists === false ? false : null;
    const result: VerifyResult = {
      exists,
      confidence: parsed?.confidence || "low",
      reason: parsed?.reason || "",
      verified: exists === true,
    };
    cache.set(key, { result, ts: Date.now() });
    return result;
  } catch (e: any) {
    return { verified: false, exists: null, confidence: "low", reason: "公司核实服务暂不可用", error: e?.message };
  }
}
