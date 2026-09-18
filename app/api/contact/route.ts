import { NextRequest, NextResponse } from 'next/server'
import { getBrandInfo } from '@/lib/server/brand'
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { getClientIp, getLocationFields } from '@/lib/geo'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import nodemailer from 'nodemailer'
import { consumeCaptcha } from '@/lib/captcha'
import { getSmtpConfig, isSmtpConfigured as checkSmtpConfigured } from '@/lib/server/smtp-config'
import { escapeHtml } from '@/lib/server/escape-html'

// 输入过滤：去除 HTML 标签、控制字符，限制长度
function sanitizeInput(value: string, maxLength: number): string {
  if (!value) return ''
  // 去除 HTML 标签
  let cleaned = value.replace(/<[^>]*>/g, '')
  // 去除控制字符（保留换行）
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // 限制长度
  return cleaned.substring(0, maxLength).trim()
}

// 邮箱格式验证
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 电话格式验证（宽松：允许数字、+、-、空格、括号）
function isValidPhone(phone: string): boolean {
  return /^[+\d\s\-()]{6,20}$/.test(phone)
}

// 多语言错误提示
const errorMessages: Record<string, Record<string, string>> = {
  zh: {
    captchaRequired: '请输入验证码',
    captchaExpired: '验证码已过期，请刷新后重试',
    captchaWrong: '验证码错误，请重新输入',
    requiredFields: '姓名、电话和留言内容不能为空',
    invalidPhone: '请输入有效的电话号码',
    invalidEmail: '请输入有效的邮箱地址',
  },
  en: {
    captchaRequired: 'Please enter the captcha',
    captchaExpired: 'Captcha expired, please refresh and try again',
    captchaWrong: 'Captcha incorrect, please re-enter',
    requiredFields: 'Name, phone and message are required',
    invalidPhone: 'Please enter a valid phone number',
    invalidEmail: 'Please enter a valid email address',
  },
  ja: {
    captchaRequired: '認証コードを入力してください',
    captchaExpired: '認証コードの有効期限が切れました。更新して再試行してください',
    captchaWrong: '認証コードが間違っています。再入力してください',
    requiredFields: '名前、電話番号、メッセージは必須です',
    invalidPhone: '有効な電話番号を入力してください',
    invalidEmail: '有効なメールアドレスを入力してください',
  },
  ko: {
    captchaRequired: '인증코드를 입력해주세요',
    captchaExpired: '인증코드가 만료되었습니다. 새로고침 후 다시 시도해주세요',
    captchaWrong: '인증코드가 올바르지 않습니다. 다시 입력해주세요',
    requiredFields: '이름, 전화번호, 메시지는 필수입니다',
    invalidPhone: '유효한 전화번호를 입력해주세요',
    invalidEmail: '유효한 이메일 주소를 입력해주세요',
  },
  fr: {
    captchaRequired: 'Veuillez entrer le captcha',
    captchaExpired: 'Captcha expiré, veuillez actualiser et réessayer',
    captchaWrong: 'Captcha incorrect, veuillez ressaisir',
    requiredFields: 'Nom, téléphone et message sont requis',
    invalidPhone: 'Veuillez entrer un numéro de téléphone valide',
    invalidEmail: 'Veuillez entrer une adresse email valide',
  },
  ar: {
    captchaRequired: 'يرجى إدخال رمز التحقق',
    captchaExpired: 'انتهت صلاحية رمز التحقق، يرجى التحديث وإعادة المحاولة',
    captchaWrong: 'رمز التحقق غير صحيح، يرجى إعادة الإدخال',
    requiredFields: 'الاسم والهاتف والرسالة مطلوبة',
    invalidPhone: 'يرجى إدخال رقم هاتف صالح',
    invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
  },
}

function getErrorMsg(locale: string, key: string): string {
  const lang = errorMessages[locale] ? locale : 'zh'
  return errorMessages[lang][key] || errorMessages.zh[key] || key
}

// 判断 SMTP 是否已配置
async function isSmtpConfigured(): Promise<boolean> {
  return checkSmtpConfigured();
}

// 发送新留言通知邮件给管理员
async function notifyAdminByEmail(msg: any): Promise<void> {
  if (!(await isSmtpConfigured())) {
    console.log('[联系表单] 未配置 SMTP，跳过邮件通知，留言已保存到数据库')
    return
  }
  try {
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    })
    const from = cfg.from || cfg.user
    const fromName = cfg.fromName || brand.name
    // 通知邮箱优先级：后台配置 notifyEmail > 环境变量 > SMTP 账号
    let notifyTo = cfg.user
    try {
      const nc = await prisma.siteConfig.findUnique({ where: { configKey: 'notifyEmail' } })
      if (nc && typeof nc.configValue === 'string' && nc.configValue.trim()) {
        notifyTo = nc.configValue.trim()
      } else if (process.env.ADMIN_NOTIFY_EMAIL) {
        notifyTo = process.env.ADMIN_NOTIFY_EMAIL
      }
    } catch (e) {
      if (process.env.ADMIN_NOTIFY_EMAIL) notifyTo = process.env.ADMIN_NOTIFY_EMAIL
    }

    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: notifyTo,
      subject: `【新留言】${msg.name} - ${msg.subject || '网站留言'}`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;">
            <span style="color:#fff;font-size:16px;font-weight:bold;">${brand.name} — 新留言通知</span>
          </div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">管理员您好，网站收到一条新留言：</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:90px;">姓名</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(msg.name || '-')}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">电话</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(msg.phone || '-')}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">邮箱</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(msg.email || '-')}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">公司</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(msg.company || '-')}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">咨询类型</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${escapeHtml(msg.subject || '-')}</td></tr>
              <tr><td style="padding:6px 8px;color:#888;vertical-align:top;">留言内容</td><td style="padding:6px 8px;">${escapeHtml(msg.message || '-').replace(/\n/g, '<br>')}</td></tr>
            </table>
            <p style="margin:20px 0 0;color:#999;font-size:12px;">提交时间：${new Date().toLocaleString('zh-CN')}　|　请登录后台 /admin/leads 查看和管理</p>
          </div>
        </div>
      `,
    })
    console.log('[联系表单] 管理员通知邮件已发送')
  } catch (err) {
    console.error('[联系表单] 通知邮件发送失败：', err)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    const where: any = {}
    if (status && status !== 'all') where.status = status

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(serializeBigInt(messages))
  } catch (error: any) {
    // 空 body / 非法 JSON：按缺字段校验处理，返回 400 而非 500
    const isJsonParseError = error instanceof SyntaxError || /JSON|Unexpected end/i.test(error?.message || "");
    if (isJsonParseError) {
      return NextResponse.json({ error: getErrorMsg("zh", "requiredFields") }, { status: 400 });
    }
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("contact", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  // 公开接口：前台用户提交留言
  try {
    const body = await req.json()
    const { name, phone, message, company, email, subject, source, captchaId, captchaAnswer, locale, visitorKey } = body
    const lang = locale || 'zh'

    // 验证码验证
    if (!captchaId || !captchaAnswer) {
      return NextResponse.json({ error: getErrorMsg(lang, 'captchaRequired') }, { status: 400 })
    }
    const expectedAnswer = consumeCaptcha(captchaId)
    if (expectedAnswer === null) {
      return NextResponse.json({ error: getErrorMsg(lang, 'captchaExpired') }, { status: 400 })
    }
    if (String(captchaAnswer).trim() !== expectedAnswer) {
      return NextResponse.json({ error: getErrorMsg(lang, 'captchaWrong') }, { status: 400 })
    }

    // 输入过滤与验证
    const cleanName = sanitizeInput(name, 50)
    const cleanPhone = sanitizeInput(phone, 20)
    const cleanMessage = sanitizeInput(message, 2000)
    const cleanCompany = sanitizeInput(company, 100)
    const cleanEmail = sanitizeInput(email, 100)
    const cleanSubject = sanitizeInput(subject, 100)

    if (!cleanName || !cleanPhone || !cleanMessage) {
      return NextResponse.json({ error: getErrorMsg(lang, 'requiredFields') }, { status: 400 })
    }

    if (!isValidPhone(cleanPhone)) {
      return NextResponse.json({ error: getErrorMsg(lang, 'invalidPhone') }, { status: 400 })
    }

    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: getErrorMsg(lang, 'invalidEmail') }, { status: 400 })
    }

    const _loc = getLocationFields(getClientIp(req.headers));
    const msg = await prisma.contactMessage.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        message: cleanMessage,
        company: cleanCompany || null,
        email: cleanEmail || null,
        subject: cleanSubject || null,
        source: source || null,
        visitorKey: sanitizeInput(visitorKey, 64) || null,
        status: 'new',
        ip: _loc.ip,
        country: _loc.country,
        city: _loc.city,      },
    })

    // 异步发送管理员通知邮件（不阻塞响应）
    notifyAdminByEmail(msg).catch(() => {})

    // EDM 订阅者自动收集（留言邮箱）
    try {
      const { ensureEmailSubscriber } = await import("@/lib/email-subscriber");
      await ensureEmailSubscriber(cleanEmail, "留言", source || "contact:留言", cleanName || undefined);
    } catch { /* 静默 */ }

    return NextResponse.json(serializeBigInt(msg))
  } catch (error: any) {
    // 空 body / 非法 JSON：按缺字段校验处理，返回 400 而非 500
    const isJsonParseError = error instanceof SyntaxError || /JSON|Unexpected end/i.test(error?.message || "");
    if (isJsonParseError) {
      return NextResponse.json({ error: getErrorMsg("zh", "requiredFields") }, { status: 400 });
    }
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
