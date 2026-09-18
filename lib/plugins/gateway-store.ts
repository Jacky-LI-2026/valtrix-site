/**
 * 对外 API 网关 · Key 存储（API Gateway Key Store）
 * =====================================================
 * 网关调用密钥管理：存 site_config.plugin_api_keys（Json 数组）。
 * 条目：{ key, name, createdAt, lastUsed }
 * 调用方在请求头 X-API-Key 传 key，网关 verifyKey 校验后放行（仅 public 能力）。
 */
// 复用全局单例（勿自建 PrismaClient：原实现在模块加载时 new 且从不 disconnect，长期运行会泄漏连接池）
import { prisma } from '@/lib/prisma';

const CONFIG_KEY = "plugin_api_keys";

export interface GatewayKey {
  key: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  /** 积分余额（R4 计费）；未设置时视为无余额限制 */
  balance?: number | null;
  /** 累计消耗积分 */
  totalUsed?: number;
}

/** 用量聚合：按 key 累计（读取 gateway-audit.jsonl 或内存累计） */
export interface GatewayUsage {
  key: string;
  name: string;
  totalCalls: number;
  totalCredits: number;
  lastCallAt?: string;
}

function randomKey(): string {
  const buf = crypto.getRandomValues(new Uint8Array(24));
  return "zw_" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listGatewayKeys(): Promise<GatewayKey[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    const arr = (row?.configValue as unknown as GatewayKey[]) || [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveGatewayKeys(keys: GatewayKey[]): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { configKey: CONFIG_KEY },
    update: { configValue: keys as any },
    create: { configKey: CONFIG_KEY, configValue: keys as any },
  });
}

/** 创建新 key（name 用途说明；可选初始积分余额） */
export async function createGatewayKey(name: string, balance?: number): Promise<GatewayKey> {
  const keys = await listGatewayKeys();
  const entry: GatewayKey = {
    key: randomKey(),
    name: name || "未命名",
    createdAt: new Date().toISOString(),
    balance: typeof balance === "number" && balance >= 0 ? balance : null,
    totalUsed: 0,
  };
  keys.push(entry);
  await saveGatewayKeys(keys);
  return entry;
}

/** 设置某 key 的积分余额（充值/扣减；null=不限） */
export async function setGatewayKeyBalance(key: string, balance: number | null): Promise<boolean> {
  const keys = await listGatewayKeys();
  const found = keys.find((k) => k.key === key);
  if (!found) return false;
  found.balance = balance;
  await saveGatewayKeys(keys);
  return true;
}

/**
 * 扣费（每次对外调用成功后调用）：
 *  - 有余额（number）则扣减，余额不足返回 { ok:false, balance }（网关返回 402）；
 *  - 无余额限制（null）直接记录累计。
 * 返回 { ok, balance, totalUsed }。
 */
export async function chargeGatewayKey(key: string, credits: number): Promise<{ ok: boolean; balance: number | null; totalUsed: number }> {
  const keys = await listGatewayKeys();
  const found = keys.find((k) => k.key === key);
  if (!found) return { ok: false, balance: null, totalUsed: 0 };
  const used = (found.totalUsed || 0) + credits;
  found.totalUsed = used;
  let balance: number | null = null;
  if (typeof found.balance === "number") {
    balance = Math.max(0, found.balance - credits);
    if (found.balance < credits) {
      await saveGatewayKeys(keys);
      return { ok: false, balance, totalUsed: used };
    }
    found.balance = balance;
  }
  await saveGatewayKeys(keys);
  return { ok: true, balance, totalUsed: used };
}

/** 删除 key（幂等） */
export async function revokeGatewayKey(key: string): Promise<boolean> {
  const keys = await listGatewayKeys();
  const next = keys.filter((k) => k.key !== key);
  if (next.length === keys.length) return false;
  await saveGatewayKeys(next);
  return true;
}

/** 校验 key 是否有效；有效则更新时间戳（幂等防抖） */
export async function verifyGatewayKey(key: string): Promise<boolean> {
  if (!key) return false;
  const keys = await listGatewayKeys();
  const found = keys.find((k) => k.key === key);
  if (!found) return false;
  // 惰性更新时间戳（超过 1 分钟才写库，避免每个请求都 upsert）
  const now = Date.now();
  const last = found.lastUsed ? new Date(found.lastUsed).getTime() : 0;
  if (now - last > 60_000) {
    found.lastUsed = new Date().toISOString();
    await saveGatewayKeys(keys);
  }
  return true;
}
