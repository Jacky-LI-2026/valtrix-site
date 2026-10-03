/**
 * 插件市场公共逻辑（Plugin Market）
 * =====================================================
 * - 市场目录组合（内置 registry + 示例远程条目 + 可选远程 JSON URL）
 * - 已开通付费插件列表（site_config.plugin_activated）
 * - 远程市场 URL 配置（site_config.plugin_market_url，可选）
 * - 付费兑换码 HMAC-SHA256 签名 / 验签（base64url(payload).base64url(signature)）
 *
 * 兑换码签名密钥：优先读 process.env.PLUGIN_MARKET_SECRET；
 * 未配置时使用下方默认 key（仅演示用途）。
 * TODO: 生产环境必须配置 PLUGIN_MARKET_SECRET 环境变量，否则兑换码可被持有默认 key 者伪造。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D2）。
 * 基座化改动：默认密钥去除品牌前缀（基地不感知行业），并保留历史默认值
 * 作为**验签兼容**——阀门站 fork 期签发的兑换码仍可校验通过。
 */
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_PLUGINS,
  MARKET_EXAMPLE_PLUGINS,
  PluginCategory,
  PluginManifest,
  getMarketManifest,
} from "./registry";
import { getPluginState, savePluginState, PluginEntry } from "./store";

const ACTIVATED_KEY = "plugin_activated";
const MARKET_URL_KEY = "plugin_market_url";

// 演示默认密钥：**仅非生产环境**可用。
// 生产环境若未配置 PLUGIN_MARKET_SECRET，getMarketSecret() 会直接抛错（见其函数体注释）。
const DEFAULT_SECRET = "cms-plugin-market-secret-2026";

/**
 * 历史默认密钥：阀门站 fork 期使用。**仅用于验签兼容**，不再用于签发。
 * 若某部署曾以旧默认值签发过兑换码，去掉此项会导致这些码全部失效。
 */
const LEGACY_SECRETS = ["valtrix-plugin-market-secret-2026"];

export function getMarketSecret(): string {
  const fromEnv = process.env.PLUGIN_MARKET_SECRET;
  if (fromEnv) return fromEnv;
  // ⚠️ 2026-09-16 安全加固（G8）：生产环境**拒绝**回退到演示默认密钥。
  //    此前该函数静默回退 `DEFAULT_SECRET`（"cms-plugin-market-secret-2026"），
  //    而该串是**源码内公开可猜的固定值** ⇒ 任何知道它的人都能伪造兑换码。
  //    实测依据：本机 `.env` / `.env.local` 均未配置 `PLUGIN_MARKET_SECRET`
  //    （键名清单核对），`docs/双fork合并方案-20260912.md:600` 亦已记录
  //    「生产仍必须配置 PLUGIN_MARKET_SECRET（Base 的 .env/.env.local 目前均未配置）」。
  //    改为 fail-fast：未配置即抛错 —— 宁可拒绝签发/验签，也不签发可被伪造的码
  //    （对齐插件铁律「内核不可用须拒绝服务」）。
  //    非生产环境保留演示默认值，便于本地开发。
  if (process.env.NODE_ENV !== "production") return DEFAULT_SECRET;
  throw new Error(
    "PLUGIN_MARKET_SECRET 未配置：生产环境拒绝使用演示默认密钥签发/校验插件兑换码。请在 .env 中配置该变量后重启。"
  );
}

/** 验签时依次尝试的密钥列表（当前密钥优先，其后为历史密钥） */
function candidateSecrets(): string[] {
  const primary = getMarketSecret();
  return [primary, ...LEGACY_SECRETS.filter((s) => s !== primary)];
}

// ===== 已开通付费插件列表（site_config.plugin_activated）=====

/** 已开通付费插件 key 列表 */
export async function getPluginActivated(): Promise<string[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: ACTIVATED_KEY } });
    const v = row?.configValue as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export async function savePluginActivated(keys: string[]): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { configKey: ACTIVATED_KEY },
    create: { configKey: ACTIVATED_KEY, configValue: keys as any },
    update: { configValue: keys as any },
  });
}

/** 插件是否已开通付费（付费插件专用；免费插件恒视为已开通） */
export async function isPluginActivated(key: string): Promise<boolean> {
  const manifest = getMarketManifest(key);
  if (manifest && !manifest.paid) return true;
  const list = await getPluginActivated();
  return list.includes(key);
}

// ===== 远程市场 URL 配置（site_config.plugin_market_url，可选）=====

export async function getPluginMarketUrl(): Promise<string | null> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: MARKET_URL_KEY } });
    const v = row?.configValue as unknown;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

// ===== 市场目录 =====

/** 内置目录 = registry 全部 builtin 插件（market!==false）+ 示例远程条目 */
export function getBuiltinMarketPlugins(): PluginManifest[] {
  return [...BUILTIN_PLUGINS, ...MARKET_EXAMPLE_PLUGINS].filter((p) => p.market !== false);
}

const CATEGORIES: PluginCategory[] = [
  "ai",
  "seo",
  "content",
  "marketing",
  "data",
  "system",
  "integration",
];

/** 远程目录条目白名单清洗（不信任远程 JSON，只取安全字段） */
function sanitizeRemotePlugin(raw: any): PluginManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) return null;
  const category = CATEGORIES.includes(raw.category as PluginCategory)
    ? (raw.category as PluginCategory)
    : "integration";
  const out: PluginManifest = {
    key,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : key,
    description: typeof raw.description === "string" ? raw.description : "",
    category,
    version: typeof raw.version === "string" && raw.version.trim() ? raw.version.trim() : "1.0.0",
    builtin: false,
    defaultEnabled: !!raw.defaultEnabled,
    configurable: !!raw.configurable,
    features: Array.isArray(raw.features) ? raw.features.filter((f: any) => typeof f === "string").slice(0, 12) : [],
    impact: typeof raw.impact === "string" ? raw.impact : "",
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.filter((d: any) => typeof d === "string") : undefined,
    adminUrl: typeof raw.adminUrl === "string" ? raw.adminUrl : undefined,
    price: typeof raw.price === "number" && raw.price > 0 ? raw.price : 0,
    paid: !!raw.paid,
    market: raw.market !== false,
    marketSource: "remote",
    // 2026-09-18（P1-5）：远程目录同样可以声明"规划中"，与内置示例条目一致
    //（前端会显示「规划中」且不提供安装；`installMarketPlugin` 亦会拒绝）。
    planned: !!raw.planned,
  };
  return out;
}

/** 远程目录内存缓存（5 分钟 TTL；服务重启即失效，属可接受） */
let catalogCache: { data: { plugins: PluginManifest[]; source: "remote" | "builtin" }; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 拉取市场目录：优先 site_config.plugin_market_url 配置的远程 JSON，
 * fetch 失败 / 超时 / 未配置时回退内置目录（registry builtin + 示例远程条目）。
 * @param force 忽略缓存强制刷新
 */
export async function fetchMarketCatalog(force = false): Promise<{
  plugins: PluginManifest[];
  source: "remote" | "builtin";
  cached: boolean;
}> {
  if (!force && catalogCache && Date.now() - catalogCache.ts < CACHE_TTL) {
    return { ...catalogCache.data, cached: true };
  }
  const url = await getPluginMarketUrl();
  if (url) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json?.plugins) ? (json.plugins as any[]) : [];
        const plugins = rawList
          .map((p) => sanitizeRemotePlugin(p))
          .filter((p): p is PluginManifest => p !== null);
        if (plugins.length > 0) {
          const data = { plugins, source: "remote" as const };
          catalogCache = { data, ts: Date.now() };
          return { ...data, cached: false };
        }
      }
    } catch {
      // 远程拉取失败 → 回退内置目录
    }
  }
  const data = { plugins: getBuiltinMarketPlugins(), source: "builtin" as const };
  catalogCache = { data, ts: Date.now() };
  return { ...data, cached: false };
}

// ===== 兑换码（HMAC-SHA256）=====

export interface PluginCodePayload {
  pluginKey: string;
  /** 有效期（ISO 日期）；缺省 = 永久 */
  exp?: string;
  issuedAt: string;
  /** 客户标识（可选） */
  cid?: string;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Buffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

/** 生成兑换码：base64url(payload).base64url(HMAC-SHA256(body)) */
export function signPluginCode(payload: PluginCodePayload): string {
  const body = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getMarketSecret()).update(body).digest();
  return `${body}.${toBase64Url(sig)}`;
}

/** 验签 + 校验插件匹配 / 有效期（依次尝试当前密钥与历史密钥） */
export function verifyPluginCode(code: string, key: string): { ok: boolean; error?: string } {
  try {
    const parts = code.split(".");
    if (parts.length !== 2) return { ok: false, error: "兑换码格式不正确" };
    const [body, sigB64] = parts;
    const provided = fromBase64Url(sigB64);

    // 依次用候选密钥验签：任一通过即可（兼容历史默认密钥签发的码）
    let signatureOk = false;
    for (const secret of candidateSecrets()) {
      const expected = createHmac("sha256", secret).update(body).digest();
      if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
        signatureOk = true;
        break;
      }
    }
    if (!signatureOk) {
      return { ok: false, error: "兑换码签名校验失败" };
    }

    const payload = JSON.parse(Buffer.from(fromBase64Url(body)).toString("utf8")) as PluginCodePayload;
    if (!payload || payload.pluginKey !== key) return { ok: false, error: "兑换码与插件不匹配" };
    if (payload.exp) {
      const exp = new Date(payload.exp).getTime();
      if (Number.isNaN(exp)) return { ok: false, error: "兑换码有效期无效" };
      if (exp < Date.now()) return { ok: false, error: "兑换码已过期" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "兑换码无效" };
  }
}

/** 解析有效期入参 → ISO 日期字符串：'30d'（N 天）/ 'permanent'（永久）/ 'YYYY-MM-DD'；缺省 30 天 */
export function parseExpiry(exp?: string): { iso?: string } {
  if (!exp || exp === "permanent") return {};
  if (/^\d+d$/.test(exp)) {
    const days = parseInt(exp, 10);
    return { iso: new Date(Date.now() + days * 86400000).toISOString() };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(exp)) {
    return { iso: new Date(exp + "T23:59:59+08:00").toISOString() };
  }
  return { iso: new Date(Date.now() + 30 * 86400000).toISOString() };
}

// ===== 安装 / 卸载 =====

/** 安装市场插件：写入 plugin_state（enabled=false + 来源/价格/安装时间） */
export async function installMarketPlugin(key: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  const manifest = getMarketManifest(key);
  if (!manifest) return { ok: false, error: "市场目录中不存在该插件", status: 404 };
  // 🔴 2026-09-18 修复（P0）：**内置插件一律拒绝"安装"**。
  //
  //   背景：市场目录 = `[...BUILTIN_PLUGINS, ...MARKET_EXAMPLE_PLUGINS].filter(market !== false)`，
  //   而当前**没有任何条目标 `market:false`** ⇒ 46 个内置插件全都出现在市场里；
  //   而本函数对任何条目都写 `enabled: false` ⇒ 用户对「产品管理」这类**正在运行**的内置插件
  //   点一下「安装」，实际效果是**把它停用**（后台入口随之消失）。
  //   （实测：阀门站 `plugin_state` 只有 4 个键 ⇒ 其余 42 个内置插件在市场上都显示「安装」。）
  //
  //   为什么这样修而不是"改显示"：内置插件本来就没有"安装"这一步 —— 它随系统分发，
  //   只有「启用/停用」。把约束放在服务端，才能同时防住前端误调与后续新增的调用方。
  if (manifest.builtin || manifest.marketSource === "builtin") {
    return {
      ok: false,
      error: "内置插件无需安装（随系统分发，可直接在「已安装管理」里启用/停用）",
      status: 400,
    };
  }
  // 🔴 2026-09-18 新增（P1-5）：**规划中（planned）条目一律拒绝安装**。
  //
  //   背景：市场默认目录里的 3 条示例远程条目（`ai-video-pro` / `advanced-seo` / `crm-integration`）
  //   的 `impact` 里已写明"功能代码待部署，当前仅市场目录条目"，但接口此前**照收不误**
  //   ⇒ 用户花兑换码"买到"的只是一个开关，后台点进去仍是空页面（crm-integration 甚至指向
  //   根本不存在的 `/admin/crm`）。这与「内核不可用须拒绝服务」一致：**没实现的能力不上架可安装态**。
  //
  //   何时移除：该能力真正实现（页面 + 路由 + 权限都在）后，把 registry 里的 `planned: true` 去掉即可。
  if (manifest.planned) {
    return {
      ok: false,
      error: "该条目为规划中能力（功能尚未实现），暂不可安装",
      status: 400,
    };
  }
  const state = await getPluginState();
  if (state[key]) return { ok: false, error: "插件已安装，请勿重复安装", status: 409 };
  const entry: PluginEntry = {
    enabled: false,
    config: {},
    installedAt: new Date().toISOString(),
    marketSource: manifest.marketSource || "builtin",
    price: manifest.price,
    // 2026-09-18：记录安装时的目录版本，供后台提示"已装版本与市场不一致"
    version: manifest.version,
  };
  state[key] = entry;
  await savePluginState(state);
  return { ok: true };
}

/** 卸载市场插件：仅远程安装（marketSource==='remote'）可卸载；builtin 返回 400 */
export async function uninstallMarketPlugin(key: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  const manifest = getMarketManifest(key);
  if (manifest?.builtin || manifest?.marketSource === "builtin") {
    return { ok: false, error: "内置插件不可卸载（仅可启停）", status: 400 };
  }
  const state = await getPluginState();
  const entry = state[key];
  if (!entry) return { ok: false, error: "插件未安装", status: 404 };
  if (entry.marketSource && entry.marketSource !== "remote") {
    return { ok: false, error: "仅远程市场安装的插件可卸载", status: 400 };
  }
  delete state[key];
  await savePluginState(state);
  return { ok: true };
}
