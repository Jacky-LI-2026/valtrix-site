// 前台会员鉴权：HMAC 签名 token（与 admin NextAuth 完全隔离）
import crypto from "crypto";

const SECRET = process.env.MEMBER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "valtrix-member-token";
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
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMemberToken(token: string | undefined | null): MemberTokenPayload | null {
  if (!token) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
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
