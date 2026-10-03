// 前台会员鉴权：HMAC 签名 token（与 admin NextAuth 完全隔离）
import crypto from "crypto";
import { legacyBrandPrefixedKeys } from "@/lib/brand";

/**
 * 默认兜底密钥 —— **品牌中立**（AGENTS.md G2：不得新增硬编码品牌名）。
 *
 * 两个 fork 合并为同一份 Base 代码后，兜底密钥若含品牌串即等于把 A 站品牌
 * 固化进 B 站的签名密钥。生产环境必须配置 MEMBER_TOKEN_SECRET / NEXTAUTH_SECRET。
 */
const DEFAULT_SECRET = "cms-member-token";

/**
 * 历史兜底密钥：**仅用于验签兼容**，不再用于签发。
 *
 * 改密钥会让已签发的 token 全部失效（所有会员被强制登出）。因此验签时依次
 * 试算当前密钥与历史密钥：旧 token 仍可校验通过，新签发的 token 一律用新密钥。
 * 与 `lib/plugins/market.ts` 的 LEGACY_SECRETS 处理方式一致。
 *
 * 历史值**从品牌名派生**（不写死品牌，各部署得到自己的旧值），并显式保留历史
 * Base 字面量 —— 它用的是品牌**拉丁 slug** `zuowen`（品牌名为「左文科技」），
 * **无法由派生覆盖**，故必须显式保留。
 * TODO(迁移期)：存量 token 全部自然过期（最长 7 天）后可删除显式字面量。
 */
const LEGACY_DEFAULT_SECRETS = legacyBrandPrefixedKeys("-member-token", [
  "zuowen-member-token", // TODO(迁移期)：存量 token 过期后可删
]);

/** 当前签发密钥（env 优先，其次品牌中立默认值） */
function primarySecret(): string {
  return process.env.MEMBER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

/** 验签时依次尝试的密钥列表（当前密钥优先，其后为历史密钥） */
function candidateSecrets(): string[] {
  const primary = primarySecret();
  return [primary, ...LEGACY_DEFAULT_SECRETS.filter((s) => s !== primary)];
}

const COOKIE = "zw_member_token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export interface MemberTokenPayload {
  mid: string; // member id（字符串化 BigInt）
  email: string;
  exp: number;
}

export function signMemberToken(mid: bigint | string, email: string): string {
  const payload: MemberTokenPayload = {
    mid: String(mid),
    email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", primarySecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMemberToken(token: string | undefined | null): MemberTokenPayload | null {
  if (!token) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const sigBuf = Buffer.from(sig);
    // 当前密钥与历史密钥逐一试算；任一通过即验签成功（旧 token 不失效）
    const ok = candidateSecrets().some((secret) => {
      const expect = crypto.createHmac("sha256", secret).update(body).digest("base64url");
      const b = Buffer.from(expect);
      return sigBuf.length === b.length && crypto.timingSafeEqual(sigBuf, b);
    });
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MemberTokenPayload;
    if (!payload.mid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function memberTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
}

export function memberTokenCookie(token: string, maxAge = MAX_AGE): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function memberTokenClearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
