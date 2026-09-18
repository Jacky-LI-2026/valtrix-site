// 前台会员 API 路由组：注册 / 登录 / 退出 / 忘记密码 / 我的信息 / 收藏
import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo, brandLetterhead, brandSubjectPrefix } from '@/lib/server/brand';
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { signMemberToken, verifyMemberToken, memberTokenFromRequest, memberTokenCookie, memberTokenClearCookie } from "@/lib/member-token";
import { getSmtpConfig, isSmtpConfigured } from "@/lib/server/smtp-config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

// 生成客户编号 ZW-000001（米思米式 B 端客户标识）
async function genCustomerNo(): Promise<string> {
  const last = await prisma.member.findFirst({
    where: { customerNo: { not: null } },
    orderBy: { customerNo: "desc" },
    select: { customerNo: true },
  });
  let seq = 1;
  if (last?.customerNo) {
    const m = String(last.customerNo).match(/(\d+)$/);
    if (m) seq = Number(m[1]) + 1;
  }
  return "ZW-" + String(seq).padStart(6, "0");
}

// 重置验证码（内存存储，10 分钟有效，60 秒冷却）
const resetStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number; attempts: number }>();
const RESET_TTL_MS = 10 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;
// 🔒 2026-09-16 安全修复：单个验证码的最大错误次数，超过即作废（防 6 位码爆破 → 账号接管）
const RESET_MAX_ATTEMPTS = 5;

// 邮箱枚举防护：forgot 分支对"已注册/未注册"返回同一句中性文案（不再 404 区分）
const FORGOT_NEUTRAL_MSG = "若该邮箱可用，我们已发送重置邮件，请查收（含垃圾邮件箱）";

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendResetEmail(email: string, code: string): Promise<"sent" | "not_configured" | "failed"> {
  if (!(await isSmtpConfigured())) {
    // eslint-disable-next-line no-console
    console.log(`[会员重置] 开发模式（未配置 SMTP）：${email} 的重置验证码为 ${code}`);
    return "not_configured";
  }
  try {
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    const from = cfg.from || cfg.user;
    const fromName = cfg.fromName || brand.name;
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: email,
      subject: `${brandSubjectPrefix(brand)}会员密码重置`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:20px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${brandLetterhead(brand)}</span>
          </div>
          <div style="padding:28px 24px;color:#333;">
            <p style="margin:0 0 16px;">您好，您正在重置会员密码，本次验证码为：</p>
            <div style="text-align:center;margin:20px 0;">
              <span style="display:inline-block;font-size:30px;font-weight:bold;letter-spacing:6px;color:#CC0000;background:#FFF5F5;padding:12px 24px;border-radius:6px;">${code}</span>
            </div>
            <p style="margin:0 0 16px;">验证码 <b>10 分钟</b>内有效，请勿向他人泄露。如非本人操作请忽略本邮件。</p>
            <p style="margin:0;color:#999;font-size:12px;">此邮件由系统自动发送，请勿直接回复。</p>
          </div>
        </div>
      `,
    });
    return "sent";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[会员重置] 邮件发送失败：", err);
    return "failed";
  }
}

async function currentMember(req: NextRequest) {
  const token = memberTokenFromRequest(req);
  const payload = verifyMemberToken(token);
  if (!payload) return null;
  const member = await prisma.member.findUnique({ where: { id: BigInt(payload.mid) } });
  if (!member || member.status !== "active") return null;
  return member;
}

// POST /api/public/member/register {email,password,name}
export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") || "register";
  const body = await req.json().catch(() => ({}));

  // 🔒 2026-09-16 安全修复（限流）：POST 入口按 IP 限流，四个 action 各用独立 key（互不挤占额度）。
  //    目的：① 拖慢 login 撞库 ② 拖慢 register/forgot 的邮箱枚举 ③ 拖慢 reset 的验证码爆破。
  //    取值按"正常用户不会触及"的保守下限；改用量前先确认前台调用方会不会被误伤。
  const rateLimits: Record<string, { key: string; limit: number; windowMs: number }> = {
    login: { key: "member-login", limit: 10, windowMs: 60 * 1000 },
    register: { key: "member-register", limit: 5, windowMs: 10 * 60 * 1000 },
    forgot: { key: "member-forgot", limit: 5, windowMs: 10 * 60 * 1000 },
    reset: { key: "member-reset", limit: 10, windowMs: 10 * 60 * 1000 },
  };
  const rl = rateLimits[action];
  if (rl) {
    const gate = checkRateLimit(rl.key, getClientIp(req), rl.limit, rl.windowMs);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, error: `操作过于频繁，请 ${gate.retryAfter} 秒后再试`, retryAfter: gate.retryAfter },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
      );
    }
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return bad("邮箱与密码不能为空");
    const member = await prisma.member.findUnique({ where: { email } });
    if (!member || !(await bcrypt.compare(password, member.passwordHash))) {
      return bad("邮箱或密码错误", 401);
    }
    if (member.status !== "active") return bad("账号已被禁用", 403);
    await prisma.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } });
    const res = NextResponse.json({ ok: true, member: { id: String(member.id), email: member.email, name: member.name, phone: member.phone } });
    res.headers.set("Set-Cookie", memberTokenCookie(signMemberToken(member.id, member.email)));
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", memberTokenClearCookie());
    return res;
  }

  // 忘记密码：发送重置验证码
  if (action === "forgot") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("邮箱格式不正确");
    const now = Date.now();
    // 🔒 2026-09-16 安全修复（邮箱枚举 · 第二处）：冷却判定**必须早于**会员查询，且**未注册邮箱
    //    也要写入 lastSentAt**。否则「已注册邮箱第 2 次请求返回 429、未注册邮箱永不 429」
    //    本身就构成邮箱存在性探针。（行为级实测发现，离线断言未覆盖。）
    const existing = resetStore.get(email);
    if (existing && now - existing.lastSentAt < RESET_COOLDOWN_MS) {
      return bad("发送过于频繁，请 60 秒后再试", 429);
    }
    const member = await prisma.member.findUnique({ where: { email } });
    // 🔒 2026-09-16 安全修复（邮箱枚举 · 第一处）：未注册时与已注册**完全同一**响应
    //    （同状态码 + 同文案 + 同冷却行为），不落验证码、不发信。
    if (!member) {
      resetStore.set(email, { code: "", expiresAt: 0, lastSentAt: now, attempts: 0 });
      return NextResponse.json({ ok: true, message: FORGOT_NEUTRAL_MSG });
    }
    const code = genCode();
    resetStore.set(email, { code, expiresAt: now + RESET_TTL_MS, lastSentAt: now, attempts: 0 });
    const sent = await sendResetEmail(email, code);
    // 🔒 2026-09-16 安全修复：验证码只在「未配置 SMTP」（本地联调）时回显。
    //    原先用 `if (!sent)` 判断，而 SMTP 已配置但发送抛异常同样返回 false
    //    ⇒ 生产 SMTP 故障时会把验证码回显给任意调用者；现按三态严格区分。
    if (sent === "not_configured") {
      // 开发模式：验证码在响应中回显，便于本地联调
      return NextResponse.json({ ok: true, devMode: true, code, message: "已发送（开发模式，验证码见响应）" });
    }
    // sent === "failed"：不回显验证码，也不暴露该邮箱是否存在（与未注册分支同一文案）
    if (sent === "failed") return NextResponse.json({ ok: true, message: FORGOT_NEUTRAL_MSG });
    // 🔒 2026-09-16 安全修复（邮箱枚举 · 第三处）：已注册的成功文案必须与未注册**逐字相同**，
    //    否则正文差异即可区分邮箱是否存在（行为级实测发现）。
    return NextResponse.json({ ok: true, message: FORGOT_NEUTRAL_MSG });
  }

  // 忘记密码：校验验证码并重置密码
  if (action === "reset") {
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("邮箱格式不正确");
    if (!code) return bad("请输入验证码");
    if (password.length < 6) return bad("新密码至少 6 位");
    const entry = resetStore.get(email);
    if (!entry || entry.expiresAt < Date.now()) return bad("验证码已过期，请重新获取", 400);
    if (entry.code !== code) {
      // 🔒 2026-09-16 安全修复（验证码爆破 → 账号接管）：原先验证码错误既不计数也不锁定，
      //    6 位码可在 10 分钟 TTL 内无限次尝试。现逐次累计，达到上限直接作废该验证码并要求重新发码。
      entry.attempts = (entry.attempts || 0) + 1;
      resetStore.set(email, entry);
      if (entry.attempts >= RESET_MAX_ATTEMPTS) {
        resetStore.delete(email);
        return bad("验证码错误次数过多，请重新获取验证码", 429);
      }
      return bad("验证码错误", 400);
    }
    const member = await prisma.member.findUnique({ where: { email } });
    if (!member) return bad("该邮箱未注册", 404);
    await prisma.member.update({
      where: { id: member.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    resetStore.delete(email);
    return NextResponse.json({ ok: true, message: "密码已重置，请使用新密码登录" });
  }

  // register
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim().slice(0, 50);
  const company = String(body.company || "").trim().slice(0, 200);
  const industry = String(body.industry || "").trim().slice(0, 50);
  const country = String(body.country || "").trim().slice(0, 50);
  const phone = String(body.phone || "").trim().slice(0, 20);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("邮箱格式不正确");
  if (password.length < 6) return bad("密码至少 6 位");
  const exists = await prisma.member.findUnique({ where: { email } });
  // 🔒 2026-09-16 安全修复（邮箱枚举，保守处理）：文案改为中性提示，仍保留 400 失败状态码。
  //    不改状态码的原因：app/member/register/page.tsx:40 以 `d.ok` 判定注册成功并跳转 /member，
  //    若改为 200 中性成功，用户会以为注册成功却被跳到未登录页（契约破坏）。此处仅降低文案信息量。
  if (exists) return bad("该邮箱不可用，请更换邮箱或直接登录");
  const member = await prisma.member.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      phone: phone || null,
      company: company || null,
      industry: industry || null,
      country: country || null,
      customerNo: await genCustomerNo(),
    },
  });
  const res = NextResponse.json({ ok: true, member: { id: String(member.id), email: member.email, name: member.name, phone: member.phone, company: member.company, customerType: member.customerType, customerNo: member.customerNo } });
  res.headers.set("Set-Cookie", memberTokenCookie(signMemberToken(member.id, member.email)));
  return res;
}

// GET /api/public/member/me
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const member = await currentMember(req);
  if (!member) return NextResponse.json({ ok: false, error: "未登录" }); // 200：未登录属正常状态，避免前台 Header 组件产生 401 噪声
  // 存量会员懒生成客户编号
  if (!member.customerNo) {
    const no = await genCustomerNo();
    await prisma.member.update({ where: { id: member.id }, data: { customerNo: no } });
    member.customerNo = no;
  }
  if (sp.get("action") === "favorites") {
    const favs = await prisma.memberFavorite.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, slug: true, model: true, name: true, nameEn: true, images: true } } },
      take: 100,
    });
    return NextResponse.json({
      ok: true,
      favorites: favs.map((f) => ({
        id: String(f.id),
        productId: String(f.productId),
        createdAt: f.createdAt,
        product: {
          id: String(f.product.id),
          slug: f.product.slug,
          model: f.product.model,
          name: f.product.name,
          nameEn: f.product.nameEn,
          image: Array.isArray(f.product.images) && (f.product.images as any[]).length > 0
            ? (typeof (f.product.images as any[])[0] === "string" ? (f.product.images as any[])[0] : ((f.product.images as any[])[0]?.url || ""))
            : null,
        },
      })),
    });
  }
  const favCount = await prisma.memberFavorite.count({ where: { memberId: member.id } });
  if (sp.get("action") === "quotes") {
    const quotes = await prisma.quoteRequest.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      ok: true,
      quotes: quotes.map((q) => ({
        id: String(q.id),
        quoteNo: q.quoteNo,
        company: q.company,
        items: q.items,
        totalMin: q.totalMin ? String(q.totalMin) : null,
        totalMax: q.totalMax ? String(q.totalMax) : null,
        currency: q.currency,
        status: q.status,
        reviewStatus: q.reviewStatus,
        createdAt: q.createdAt,
        // 原实现为 `pdfUrl: '/api/quote/pdf?id=' + q.id`（GET + ?id=），而该路由**只导出 POST**
        // 且只读 body.quoteNo ⇒ 该链接自诞生起就不可能成功（405/400）。
        // 且其口径绑 `reviewStatus === 'approved'`，与第三轮已删除该分支的放行判据
        // （后台 ∨ 提交者票据 ∨ **会员本人归属**，审核状态不参与）相冲突。
        // ⇒ 改为**布尔门闩**：本列表已按 memberId 过滤，每条都是本人的，命中「会员本人归属」。
        canDownloadPdf: true,
      })),
    });
  }
  if (sp.get("action") === "downloads") {
    const leads = await prisma.downloadLead.findMany({
      where: { email: member.email },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      ok: true,
      downloads: leads.map((d) => ({
        id: String(d.id),
        resourceType: d.resourceType,
        resourceName: d.resourceName,
        status: d.status,
        createdAt: d.createdAt,
        downloadUrl: d.downloadUrl,
      })),
    });
  }
  const [levels, myLevel, myType] = await Promise.all([
    prisma.memberLevel.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.memberLevel.findUnique({ where: { key: member.level } }).catch(() => null),
    prisma.customerType.findUnique({ where: { key: member.customerType || "inquiry" } }).catch(() => null),
  ]);
  const sorted = [...levels].sort((a, b) => a.threshold - b.threshold);
  let nextLevel = null;
  let progress = 100;
  let nextThreshold = 0;
  if (sorted.length > 0) {
    const cur = sorted.find((l) => l.key === member.level) || sorted[0];
    const next = sorted.find((l) => l.threshold > (cur?.threshold ?? 0));
    if (next) {
      nextLevel = { key: next.key, name: next.name, threshold: next.threshold };
      nextThreshold = next.threshold;
      const prev = (cur?.threshold ?? 0);
      progress = nextThreshold > prev ? Math.min(100, Math.round(((member.points - prev) / (nextThreshold - prev)) * 100)) : 0;
    }
  }
  return NextResponse.json({
    ok: true,
    member: {
      id: String(member.id), email: member.email, name: member.name, phone: member.phone,
      company: member.company, industry: member.industry, country: member.country,
      customerNo: member.customerNo, locale: member.locale, createdAt: member.createdAt,
      customerType: member.customerType || "inquiry",
      seePartsPrice: Boolean(myType?.seePartsPrice),
      invoiceTitle: member.invoiceTitle, taxNo: member.taxNo, invoiceEmail: member.invoiceEmail,
      address: member.address,
    },
    typeDiscount: myType?.discount ?? 0,
    levelDiscount: myLevel?.discount ?? 0,
    favCount,
    level: {
      key: member.level,
      name: myLevel?.name || member.level,
      points: member.points,
      discount: myLevel?.discount ?? 0,
      benefits: myLevel?.benefits ?? "",
      threshold: myLevel?.threshold ?? 0,
      progress,
      nextLevel,
    },
  });
}

// PUT /api/public/member/me {name,phone,locale,oldPassword,newPassword}
export async function PUT(req: NextRequest) {
  const member = await currentMember(req);
  if (!member) return bad("未登录", 401);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 50);
  if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 20);
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 200) || null;
  if (typeof body.industry === "string") data.industry = body.industry.trim().slice(0, 50) || null;
  if (typeof body.country === "string") data.country = body.country.trim().slice(0, 50) || null;
  if (typeof body.locale === "string") data.locale = body.locale.slice(0, 10);
  if (typeof body.invoiceTitle === "string") data.invoiceTitle = body.invoiceTitle.trim().slice(0, 200) || null;
  if (typeof body.taxNo === "string") data.taxNo = body.taxNo.trim().slice(0, 50) || null;
  if (typeof body.invoiceEmail === "string") data.invoiceEmail = body.invoiceEmail.trim().slice(0, 100) || null;
  if (body.address && typeof body.address === "object") {
    const addr: any = {};
    for (const k of ["name", "phone", "province", "city", "district", "detail"]) {
      if (typeof body.address[k] === "string") addr[k] = body.address[k].trim().slice(0, 200);
    }
    data.address = addr;
  }
  if (body.oldPassword || body.newPassword) {
    if (!(await bcrypt.compare(String(body.oldPassword || ""), member.passwordHash))) return bad("原密码错误");
    if (String(body.newPassword || "").length < 6) return bad("新密码至少 6 位");
    data.passwordHash = await bcrypt.hash(String(body.newPassword), 10);
  }
  await prisma.member.update({ where: { id: member.id }, data });
  return NextResponse.json({ ok: true });
}

// POST /api/public/member/favorites/[productId] 收藏 / DELETE 取消
