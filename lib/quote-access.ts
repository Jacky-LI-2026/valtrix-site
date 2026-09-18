/**
 * 报价单 PDF 下载凭据（"提交者能力票据"）
 *
 * 背景（2026-09-16 安全修复第二轮）：
 *   报价单 PDF 路由收紧为「后台会话 ∨ reviewStatus==='approved' ∨ 提交者凭据」后，
 *   匿名客户在 /quote/success 页下载自己**刚提交**的报价单会 404。
 *   调研结论：本项目对匿名访客**没有任何**可复用的提交者凭据 ——
 *     · 全仓仅 `app/api/public/member/route.ts` 设置过 cookie（会员 token），匿名访客没有；
 *     · `visitorKey` 只存在于 localStorage（如 `app/quote/cart/page.tsx:159-170`），
 *       随 POST **body** 上送，浏览器**不会**在后续请求里自动携带 ⇒ 无法作为自动凭据；
 *     · 报价创建响应（`app/api/quote/route.ts:444`）原本不设任何 cookie。
 *
 * 方案（**不改前端契约**）：提交成功时由**服务端**下发一枚签名 cookie，把"刚创建的
 *   报价单号"作为能力票据交给**该浏览器**。`/quote/success` 页发起同源 POST 时，
 *   浏览器按默认 `credentials: 'same-origin'` 自动携带该 cookie ⇒ 前端一行都不用改。
 *
 * 安全性质：
 *   · 票据签名密钥仅存在于服务端（HMAC-SHA256，timingSafeEqual 比较），**客户端无法伪造**；
 *   · 票据只包含"本浏览器创建的报价单号"，**不含任何 PII**，且 HttpOnly（JS 读不到）；
 *   · 只知 `quoteNo` 的第三方既没有票据也无法构造票据 ⇒ 顺序遍历仍然全部 404；
 *   · **不依赖任何时间窗**：票据是能力凭据本身，`Max-Age` 只决定它何时过期。
 *
 * 已知边界（如实记录）：
 *   · 票据与浏览器绑定，换浏览器/清 cookie 后需走邮件里的 PDF；
 *   · 最多保留最近 10 个报价单号（同一浏览器连续提交 11 单时最早的一个从票据中滑出）；
 *   · 密钥与会员 token 使用**同一 env 秘密但做了用途隔离**（HMAC 标签派生），
 *     与 `lib/member-token.ts` 的默认兜底值保持一致（生产应配置 MEMBER_TOKEN_SECRET）。
 */
import crypto from "crypto";

const COOKIE = "zw_quote_access";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 天
const MAX_NOS = 10;

/** 与 `lib/member-token.ts:30-32` 同源的 env 读取（保持同一秘密，但密钥经标签隔离） */
function appSecret(): string {
  return process.env.MEMBER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "cms-member-token";
}

/** 用途隔离：由同一 env 秘密派生出本用途专属密钥，绝不直接复用会员 token 的密钥 */
function hmacKey(): Buffer {
  return crypto.createHmac("sha256", appSecret()).update("quote-access-v1").digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", hmacKey()).update(payload).digest("base64url");
}

/** 定长安全比较（避免签名比较的时序侧信道） */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** 从 Cookie 头里取原始值（与 lib/member-token.ts:81-85 同构，避免依赖 NextRequest 类型） */
function rawCookie(cookieHeader: string, name: string): string | null {
  const m = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!m) return null;
  try {
    return decodeURIComponent(m.slice(name.length + 1));
  } catch {
    return null;
  }
}

/** 读取并验签请求携带的报价单号列表；任何异常/验签失败一律返回空数组（安全默认） */
export function readQuoteAccessNos(req: Request): string[] {
  const raw = rawCookie(req.headers.get("cookie") || "", COOKIE);
  if (!raw) return [];
  try {
    const [body, sig] = raw.split(".");
    if (!body || !sig || !safeEqual(sig, sign(body))) return [];
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      nos?: unknown;
      exp?: unknown;
    };
    if (typeof data?.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return [];
    if (!Array.isArray(data.nos)) return [];
    return data.nos.filter((n): n is string => typeof n === "string" && n.length > 0);
  } catch {
    return [];
  }
}

/** 当前请求是否持有该报价单号的提交者票据 */
export function hasQuoteAccess(req: Request, quoteNo: string): boolean {
  if (!quoteNo) return false;
  return readQuoteAccessNos(req).includes(quoteNo);
}

/**
 * 报价单 PDF 的**唯一放行判据**（纯函数，便于离线单测；路由只负责收集入参）。
 *
 * 放行三选一（2026-09-16 第三轮，已**删除裸 `reviewStatus === 'approved'` 分支**）：
 *   ① 后台已登录会话；
 *   ② 本次提交者票据（`hasQuoteAccess`，绑定具体报价单号）；
 *   ③ **会员本人归属**：请求方持有效会员 token，且其 mid 与该报价单的
 *      `QuoteRequest.memberId` 一致（字段确认存在：`prisma/schema.prisma` 的
 *      `model QuoteRequest` → `memberId BigInt?  // 登录会员提交时关联`）。
 *
 * ⚠️ 本函数**刻意不接受 `reviewStatus` 入参** —— 审核状态不再参与放行判定。
 *    原 `approved` 分支是"匿名可顺序遍历下载已通过报价单"的口子，已按要求删除；
 *    需要下载的单据必须能证明"后台 / 提交者 / 归属会员"三者之一。
 */
export function canDownloadQuotePdf(opts: {
  isAdmin: boolean;
  hasSubmitterTicket: boolean;
  /** 请求方会员 mid（由既有的 `verifyMemberToken(memberTokenFromRequest(req))` 验签得出；无则 null） */
  requestMemberId: string | null;
  /** 报价单归属会员（`QuoteRequest.memberId`，BigInt | null） */
  quoteMemberId: bigint | number | string | null | undefined;
}): boolean {
  if (opts.isAdmin) return true;
  if (opts.hasSubmitterTicket) return true;
  if (!opts.requestMemberId) return false;
  if (opts.quoteMemberId === null || opts.quoteMemberId === undefined) return false;
  return String(opts.quoteMemberId) === opts.requestMemberId;
}

/**
 * 生成提交成功时下发的 Set-Cookie 值：把本次报价单号并入既有票据（去重 + 上限 10）。
 * 只返回 Set-Cookie 字符串，由调用方决定挂到哪个响应上。
 * `Secure` 仅在反代声明 HTTPS 时附加（避免本机 http dev 下 cookie 被浏览器丢弃）。
 */
export function quoteAccessSetCookie(req: Request, quoteNo: string): string {
  const nos = [quoteNo, ...readQuoteAccessNos(req).filter((n) => n !== quoteNo)].slice(0, MAX_NOS);
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = Buffer.from(JSON.stringify({ nos, exp }), "utf8").toString("base64url");
  const value = `${body}.${sign(body)}`;
  const https = (req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() === "https";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${https ? "; Secure" : ""}`;
}
