import { NextRequest, NextResponse } from "next/server";
import { getBrandInfo } from '@/lib/server/brand';
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured as checkSmtpConfigured } from "@/lib/server/smtp-config";
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { consumeCaptcha } from "@/lib/captcha";
import { isPluginEnabled } from "@/lib/plugins/store";
import { aiCapabilityEnabled } from "@/lib/ai/gateway";

/** 已通过人机验证的会话（内存）。前端生成 sessionId，验证通过后登记，对话需携带 */
const verifiedSessions = new Set<string>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 语种后缀映射：zh->"" en->En ja->Ja ko->Ko fr->Fr ar->Ar */
const SUFFIX: Record<string, string> = { zh: "", en: "En", ja: "Ja", ko: "Ko", fr: "Fr", ar: "Ar" };

const LANG_NAMES: Record<string, string> = {
  zh: "简体中文", en: "English", ja: "日本語", ko: "한국어", fr: "Français", ar: "العربية",
};

/** 站点 AI 客服默认配置 */
const DEFAULT_CONFIG = {
  enabled: true,
  name: "AI 智能客服",
  nameEn: "AI Assistant",
  nameJa: "AI アシスタント",
  nameKo: "AI 어시스턴트",
  nameFr: "Assistant IA",
  nameAr: "المساعد الذكي",
  // 欢迎语中的品牌名用 `{brand}` / `{brandEn}` 占位，由 GET 按当前部署的品牌（DB）实时替换
  welcome:
    "您好！我是{brand}智能客服，可以为您解答产品、应用领域、新闻动态等方面的问题。您也可以直接留下联系方式，我们会有专人尽快与您联系。",
  welcomeEn:
    "Hi! I'm the {brandEn} AI assistant. I can answer questions about our products, applications and news. You can also leave your contact info and our team will reach out soon.",
  welcomeJa:
    "こんにちは！{brand}のAIアシスタントです。製品、応用分野、ニュースなどについてお答えします。ご連絡先を残していただければ、担当者がすぐにご連絡いたします。",
  welcomeKo:
    "안녕하세요! {brand} AI 어시스턴트입니다. 제품, 응용 분야, 뉴스 등에 대해 답변해 드립니다. 연락처를 남겨주시면 담당자가 곧 연락드리겠습니다.",
  welcomeFr:
    "Bonjour ! Je suis l'assistant IA de {brandEn}. Je peux répondre à vos questions sur nos produits, applications et actualités. Vous pouvez aussi laisser vos coordonnées, notre équipe vous contactera rapidement.",
  welcomeAr:
    "مرحباً! أنا المساعد الذكي لـ{brand}. يمكنني الإجابة عن أسئلتك حول منتجاتنا وتطبيقاتنا وأخبارنا. يمكنك أيضاً ترك معلومات الاتصال وسيتواصل معك فريقنا قريباً.",
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  maxTurns: 8,
};

/** 客服 UI 固定文案（六语种，随 GET 下发，前端不依赖 i18n 字典） */
const UI_TEXTS: Record<string, Record<string, string>> = {
  zh: { input: "请输入您的问题…", send: "发送", human: "转人工服务", humanHint: "请留下联系方式，我们会尽快与您联系", leadTitle: "联系信息", leadName: "姓名", leadPhone: "电话", leadEmail: "邮箱（可选）", leadCompany: "公司（可选）", leadMsg: "需求描述", leadSubmit: "提交", leadSuccess: "已收到您的信息，我们会尽快与您联系！", fallback: "抱歉，我暂时无法回答这个问题，您可以留下联系方式由专人跟进。", verifyTitle: "人机验证", verifyHint: "请回答下方算式，验证后即可开始对话", verifySubmit: "验证并开始对话", verifyWrong: "验证码错误，请重新输入", verifyPlaceholder: "答案", verifyChecking: "验证中...", verifyGetCode: "获取验证码", verifyRequired: "请输入答案", verifyFailed: "验证失败，请重试", verifyNetworkError: "网络异常，请重试", leadRequired: "姓名与电话必填", leadSubmitFailed: "提交失败，请稍后再试", leadNetworkError: "网络异常，请稍后再试", chatTitle: "在线咨询", continueChat: "继续对话", disclaimer: "AI 智能回复仅供参考，请以官网正式信息为准。" },
  en: { input: "Type your question…", send: "Send", human: "Talk to a human", humanHint: "Leave your contact info and we'll reach out soon", leadTitle: "Contact info", leadName: "Name", leadPhone: "Phone", leadEmail: "Email (optional)", leadCompany: "Company (optional)", leadMsg: "Message", leadSubmit: "Submit", leadSuccess: "We've received your info and will contact you soon!", fallback: "Sorry, I can't answer that right now. You can leave your contact info for a specialist.", verifyTitle: "Human verification", verifyHint: "Solve the math below to start chatting", verifySubmit: "Verify & start", verifyWrong: "Incorrect answer, please try again", verifyPlaceholder: "Answer", verifyChecking: "Verifying...", verifyGetCode: "Get a new question", verifyRequired: "Please enter the answer", verifyFailed: "Verification failed, please try again", verifyNetworkError: "Network error, please try again", leadRequired: "Name and phone are required", leadSubmitFailed: "Submission failed, please try again later", leadNetworkError: "Network error, please try again later", chatTitle: "Live Chat", continueChat: "Continue chatting", disclaimer: "AI replies are for reference only. Please refer to the official website information." },
  ja: { input: "メッセージを入力…", send: "送信", human: "有人対応へ", humanHint: "連絡先を残していただければ、すぐにご連絡します", leadTitle: "連絡先", leadName: "お名前", leadPhone: "電話番号", leadEmail: "メール（任意）", leadCompany: "会社名（任意）", leadMsg: "ご要望", leadSubmit: "送信", leadSuccess: "情報を受け取りました。すぐにご連絡いたします！", fallback: "申し訳ありませんが、この質問には回答できません。連絡先を残していただければ担当者が対応します。", verifyTitle: "人認証", verifyHint: "以下の計算を解いて会話を開始してください", verifySubmit: "認証して開始", verifyWrong: "認証コードが間違っています", verifyPlaceholder: "答え", verifyChecking: "確認中...", verifyGetCode: "問題を取得", verifyRequired: "答えを入力してください", verifyFailed: "認証に失敗しました。もう一度お試しください", verifyNetworkError: "ネットワークエラーです。もう一度お試しください", leadRequired: "お名前と電話番号は必須です", leadSubmitFailed: "送信に失敗しました。しばらくしてからお試しください", leadNetworkError: "ネットワークエラーです。しばらくしてからお試しください", chatTitle: "オンライン相談", continueChat: "会話を続ける", disclaimer: "AIの回答は参考用です。公式サイトの正式情報をご確認ください。" },
  ko: { input: "질문을 입력하세요…", send: "보내기", human: "상담원 연결", humanHint: "연락처를 남겨주시면 곧 연락드립니다", leadTitle: "연락처", leadName: "이름", leadPhone: "전화번호", leadEmail: "이메일(선택)", leadCompany: "회사(선택)", leadMsg: "요청 내용", leadSubmit: "제출", leadSuccess: "정보를 받았습니다. 곧 연락드리겠습니다!", fallback: "죄송합니다. 지금은 이 질문에 답할 수 없습니다. 연락처를 남겨주시면 담당자가 처리합니다.", verifyTitle: "인간 확인", verifyHint: "아래 계산을 풀고 대화를 시작하세요", verifySubmit: "확인 후 시작", verifyWrong: "인증코드가 올바르지 않습니다", verifyPlaceholder: "답", verifyChecking: "확인 중...", verifyGetCode: "문제 받기", verifyRequired: "답을 입력해주세요", verifyFailed: "인증에 실패했습니다. 다시 시도해주세요", verifyNetworkError: "네트워크 오류입니다. 다시 시도해주세요", leadRequired: "이름과 전화번호는 필수입니다", leadSubmitFailed: "제출에 실패했습니다. 잠시 후 다시 시도해주세요", leadNetworkError: "네트워크 오류입니다. 잠시 후 다시 시도해주세요", chatTitle: "온라인 상담", continueChat: "대화 계속하기", disclaimer: "AI 답변은 참고용이며 공식 웹사이트 정보를 확인하세요." },
  fr: { input: "Tapez votre question…", send: "Envoyer", human: "Parler à un conseiller", humanHint: "Laissez vos coordonnées, nous vous contacterons rapidement", leadTitle: "Coordonnées", leadName: "Nom", leadPhone: "Téléphone", leadEmail: "Email (optionnel)", leadCompany: "Société (optionnelle)", leadMsg: "Message", leadSubmit: "Envoyer", leadSuccess: "Nous avons bien reçu vos informations et vous contacterons bientôt !", fallback: "Désolé, je ne peux pas répondre à cette question pour le moment. Vous pouvez laisser vos coordonnées pour qu'un spécialiste vous contacte.", verifyTitle: "Vérification humaine", verifyHint: "Résolvez le calcul ci-dessous pour démarrer", verifySubmit: "Vérifier et démarrer", verifyWrong: "Réponse incorrecte, veuillez réessayer", verifyPlaceholder: "Réponse", verifyChecking: "Vérification...", verifyGetCode: "Obtenir une question", verifyRequired: "Veuillez saisir la réponse", verifyFailed: "Échec de la vérification, veuillez réessayer", verifyNetworkError: "Erreur réseau, veuillez réessayer", leadRequired: "Le nom et le téléphone sont obligatoires", leadSubmitFailed: "Échec de l'envoi, veuillez réessayer plus tard", leadNetworkError: "Erreur réseau, veuillez réessayer plus tard", chatTitle: "Assistance en ligne", continueChat: "Continuer la conversation", disclaimer: "Les réponses IA sont fournies à titre indicatif. Veuillez consulter les informations officielles du site." },
  ar: { input: "اكتب سؤالك…", send: "إرسال", human: "التحدث مع موظف", humanHint: "اترك معلومات الاتصال وسنتواصل معك قريباً", leadTitle: "معلومات الاتصال", leadName: "الاسم", leadPhone: "الهاتف", leadEmail: "البريد الإلكتروني (اختياري)", leadCompany: "الشركة (اختياري)", leadMsg: "الطلب", leadSubmit: "إرسال", leadSuccess: "لقد استلمنا معلوماتك وسنتواصل معك قريباً!", fallback: "عذراً، لا يمكنني الإجابة على هذا السؤال حالياً. يمكنك ترك معلومات الاتصال ليتواصل معك متخصص.", verifyTitle: "التحقق البشري", verifyHint: "حل العملية أدناه لبدء المحادثة", verifySubmit: "تحقق وابدأ", verifyWrong: "الإجابة غير صحيحة، حاول مجدداً", verifyPlaceholder: "الإجابة", verifyChecking: "جارٍ التحقق...", verifyGetCode: "احصل على سؤال", verifyRequired: "يرجى إدخال الإجابة", verifyFailed: "فشل التحقق، يرجى المحاولة مرة أخرى", verifyNetworkError: "خطأ في الشبكة، يرجى المحاولة مرة أخرى", leadRequired: "الاسم والهاتف مطلوبان", leadSubmitFailed: "فشل الإرسال، يرجى المحاولة لاحقاً", leadNetworkError: "خطأ في الشبكة، يرجى المحاولة لاحقاً", chatTitle: "الدعم المباشر", continueChat: "متابعة المحادثة", disclaimer: "ردود الذكاء الاصطناعي للرجوع إليها فقط. يرجى الرجوع إلى المعلومات الرسمية للموقع." },
};

/** 读取 AI 客服配置（DB 优先，未配 apiKey 时回退翻译配置/env） */
async function getAiConfig() {
  const cfg: any = { ...DEFAULT_CONFIG };
  const parseConfig = (v: any): any => (typeof v === "string" ? JSON.parse(v) : v || {});
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "ai_chat_config" } });
    if (db) {
      Object.assign(cfg, parseConfig(db.configValue));
    }
  } catch (e) {
    console.error("读取 AI 客服配置失败，使用默认:", e);
  }
  // apiKey 回退链
  if (!cfg.apiKey) {
    try {
      const tc = await prisma.siteConfig.findUnique({ where: { configKey: "translate_config" } });
      if (tc) {
        const t = parseConfig(tc.configValue);
        if (t.aiApiKey) cfg.apiKey = t.aiApiKey;
        if (!cfg.baseUrl && t.aiBaseUrl) cfg.baseUrl = t.aiBaseUrl;
        if (!cfg.model && t.aiModel) cfg.model = t.aiModel;
      }
    } catch (e) {}
  }
  if (!cfg.apiKey) {
    cfg.apiKey = process.env.AI_TRANSLATE_API_KEY || process.env.DEEPSEEK_API_KEY || "";
  }
  return cfg;
}

/** 按语种取字段（无则回退中文） */
function pick(obj: any, base: string, locale: string): string {
  const suf = SUFFIX[locale] || "";
  const v = obj ? obj[base + suf] : undefined;
  if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
  return obj?.[base] ? String(obj[base]).trim() : "";
}

/** 检索本站知识，拼成上下文（当前语种优先） */
async function buildKnowledge(locale: string): Promise<string> {
  const parts: string[] = [];
  try {
    const products = await prisma.product.findMany({
      where: { status: "published" },
      orderBy: { sortOrder: "asc" },
      take: 12,
    });
    if (products.length) {
      const rows = products.map((p) => {
        const name = pick(p, "name", locale) || p.model;
        const desc = pick(p, "subtitle", locale) || pick(p, "summary", locale);
        const price =
          p.priceMin != null && p.priceMax != null
            ? `参考价 ¥${Number(p.priceMin).toLocaleString()} - ¥${Number(p.priceMax).toLocaleString()}${p.priceUnit || "元/台"}`
            : "价格面议";
        return `- ${name}（型号 ${p.model}）：${desc}。${price}`;
      });
      parts.push(`【产品】\n${rows.join("\n")}`);
    }
  } catch (e) {}
  try {
    const news = await prisma.news.findMany({ orderBy: { publishedAt: "desc" }, take: 8 });
    if (news.length) {
      const rows = news.map((n) => `- ${pick(n, "title", locale)}：${pick(n, "summary", locale) || pick(n, "content", locale)?.slice(0, 80) || ""}`);
      parts.push(`【新闻】\n${rows.join("\n")}`);
    }
  } catch (e) {}
  try {
    const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" }, take: 6 });
    if (services.length) {
      const rows = services.map((s) => `- ${pick(s, "title", locale)}：${pick(s, "subtitle", locale) || pick(s, "description", locale) || ""}`);
      parts.push(`【服务】\n${rows.join("\n")}`);
    }
  } catch (e) {}
  try {
    const industries = await prisma.industry.findMany({ orderBy: { sortOrder: "asc" }, take: 6 });
    if (industries.length) {
      const rows = industries.map((i) => `- ${pick(i, "name", locale)}：${pick(i, "summary", locale) || ""}`);
      parts.push(`【应用领域】\n${rows.join("\n")}`);
    }
  } catch (e) {}
  try {
    const knowledge = await prisma.aiKnowledge.findMany({ where: { status: "published" }, orderBy: { sortOrder: "asc" }, take: 40 });
    if (knowledge.length) {
      const rows = knowledge.map((k) => `- ${pick(k, "title", locale)}：${pick(k, "content", locale) || ""}`);
      parts.push(`【知识库】
${rows.join("\n")}`);
    }
  } catch (e) {}
  try {
    const faqs = await prisma.faq.findMany({ where: { status: "published" }, orderBy: { sortOrder: "asc" } });
    if (faqs.length) {
      const rows = faqs.map((f) => `- Q: ${pick(f, "question", locale)}；A: ${pick(f, "answer", locale) || ""}`);
      parts.push(`【常见问题】
${rows.join("\n")}`);
    }
  } catch (e) {}
  return parts.join("\n\n");
}

/** 命中"转人工"意向关键词 */
function shouldEscalate(message: string, locale: string): boolean {
  const kw: Record<string, string[]> = {
    zh: ["报价", "价格", "多少钱", "询价", "购买", "采购", "定制", "联系", "电话", "合同", "付款", "发货", "售后"],
    en: ["quote", "price", "cost", "buy", "purchase", "custom", "contact", "phone", "contract", "pay", "deliver", "after-sales"],
    ja: ["見積", "価格", "購入", "カスタム", "連絡", "電話", "契約", "支払", "納期", "アフター"],
    ko: ["견적", "가격", "구매", "맞춤", "연락", "전화", "계약", "결제", "배송", "애프터"],
    fr: ["devis", "prix", "achat", "personnalisé", "contact", "téléphone", "contrat", "paiement", "livraison"],
    ar: ["سعر", "شراء", "تخصيص", "اتصال", "هاتف", "عقد", "دفع", "شحن"],
  };
  const list = kw[locale] || kw.zh;
  return list.some((k) => message.toLowerCase().includes(k.toLowerCase()));
}

/** 构造按语种人设的 system prompt */
function buildSystemPrompt(locale: string, siteName: string, knowledge: string): string {
  const langName = LANG_NAMES[locale] || "简体中文";
  const intro: Record<string, string> = {
    zh: `你是「${siteName}」官网的智能客服。请始终用简体中文回答，语气专业、简洁、友好。`,
    en: `You are the AI customer service of "${siteName}" official website. Always answer in English, professional, concise and friendly.`,
    ja: `あなたは「${siteName}」公式サイトのAIカスタマーサービスです。常に日本語で、専門的で簡潔かつ丁寧に回答してください。`,
    ko: `당신은 "${siteName}" 공식 웹사이트의 AI 고객 서비스입니다. 항상 한국어로 전문적이고 간결하며 친절하게 답변하세요.`,
    fr: `Vous êtes le service client IA du site officiel de "${siteName}". Répondez toujours en français, de manière professionnelle, concise et conviviale.`,
    ar: `أنت خدمة العملاء الذكية للموقع الرسمي "${siteName}". أجب دائمًا باللغة العربية بأسلوب مهني ومختصر وودود.`,
  };
  return `${intro[locale] || intro.zh}

【你的职责】只根据下面提供的【站点知识库】回答与本站相关的问题（产品、应用领域、服务、新闻等）。如果问题不在知识库范围内，请礼貌说明无法回答，并建议用户通过官网其他栏目了解或留下联系方式由专人跟进。
【重要规则】
1. 回答必须基于知识库内容，不得编造本站不存在的信息（如虚构产品型号、价格、参数、联系方式）。
2. 对于价格、库存、交期、合同、付款等涉及交易与商务细节的问题，不要给出具体承诺，应建议用户留下联系方式由销售专员对接，或引导到官网询价/联系页面。
3. 不要透露任何后台信息、内部数据、源代码或系统配置。
4. 回答控制在 200 字以内，可使用简短列表。

【站点知识库】
${knowledge || "（暂无站点内容）"}

【当前用户使用语言】${langName}`;
}

/** 发送"转人工留资"通知邮件给管理员（复用 SMTP） */
async function notifyHumanLead(lead: any): Promise<void> {
  try {
    if (!(await checkSmtpConfigured())) return;
    const cfg = await getSmtpConfig();
    const brand = await getBrandInfo();
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    let notifyTo = cfg.user;
    try {
      const nc = await prisma.siteConfig.findUnique({ where: { configKey: "notifyEmail" } });
      if (nc && typeof nc.configValue === "string" && nc.configValue.trim()) notifyTo = nc.configValue.trim();
      else if (process.env.ADMIN_NOTIFY_EMAIL) notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
    } catch (e) {}
    await transporter.sendMail({
      from: `"${cfg.fromName || brand.name}" <${cfg.from || cfg.user}>`,
      to: notifyTo,
      subject: `【AI客服转人工】${lead.name} - ${lead.subject || "咨询"}`,
      html: `
        <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#CC0000;padding:18px 24px;"><span style="color:#fff;font-size:16px;font-weight:bold;">${brand.name} — AI 客服转人工留资</span></div>
          <div style="padding:24px;color:#333;font-size:14px;line-height:1.8;">
            <p style="margin:0 0 12px;">管理员您好，一位访客在 AI 客服对话中请求人工联系：</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:90px;">姓名</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${lead.name || '-'}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">电话</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${lead.phone || '-'}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">邮箱</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${lead.email || '-'}</td></tr>
              <tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;">公司</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${lead.company || '-'}</td></tr>
              <tr><td style="padding:6px 8px;color:#888;vertical-align:top;">需求</td><td style="padding:6px 8px;">${(lead.message || '').replace(/\n/g, '<br>')}</td></tr>
            </table>
            <p style="margin:20px 0 0;color:#999;font-size:12px;">提交时间：${new Date().toLocaleString('zh-CN')}　|　请登录后台 /admin/leads 查看</p>
          </div>
        </div>`,
    });
  } catch (e) {
    console.error("AI 客服转人工邮件发送失败:", e);
  }
}

/**
 * GET /api/chat — 返回客服初始化信息（开关/名称/欢迎语，按当前语种）
 */
export async function GET(req: NextRequest) {
  const locale = (req.nextUrl.searchParams.get("locale") || "zh").slice(0, 2);
  const cfg = await getAiConfig();
  const suf = SUFFIX[locale] || "";
  const name = cfg["name" + suf] || cfg.name || "AI 智能客服";
  // 欢迎语默认文案含 `{brand}` / `{brandEn}` 占位（见 DEFAULT_CONFIG）——此处按部署品牌实时替换。
  // 品牌名来自 DB（lib/server/brand.ts），不写死在代码里：双 fork 各自部署时不会串站。
  const brand = await getBrandInfo();
  const brandName = brand.name || "";
  const brandEnName = brand.nameEn || brandName;
  const welcome = (cfg["welcome" + suf] || cfg.welcome || "")
    .replace(/\{brandEn\}/g, brandEnName)
    .replace(/\{brand\}/g, brandName);
  const ui = UI_TEXTS[locale] || UI_TEXTS.zh;
  // 插件开关：AI 智能客服插件停用 / 全局 AI 关闭则前台隐藏
  const pluginOn = await isPluginEnabled("ai-customer-service");
  const globalAi = await aiCapabilityEnabled();
  return NextResponse.json({ ok: true, enabled: cfg.enabled !== false && pluginOn && globalAi, name, welcome, ui });
}

/**
 * POST /api/chat — 对话（RAG + DeepSeek）
 * body: { message, locale, history: [{role:'user'|'assistant', content}] }
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "lead") {
    return handleLead(req);
  }
  if (url.searchParams.get("action") === "verify") {
    return handleVerify(req);
  }
  // 防刷：每 IP 每分钟最多 15 次对话
  const rl = checkRateLimit("chat", rlIp(req), 15, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  const cfg = await getAiConfig();
  const pluginOn = await isPluginEnabled("ai-customer-service");
  const globalAi = await aiCapabilityEnabled();
  if (cfg.enabled === false || !pluginOn || !globalAi) {
    return NextResponse.json({ ok: false, error: "AI 客服暂未开启" }, { status: 400 });
  }
  if (!cfg.apiKey) {
    return NextResponse.json({ ok: false, error: "AI 客服尚未配置 API Key，请在后台设置" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }

  const message = String(body.message || "").replace(/<[^>]*>/g, "").trim().slice(0, 500);
  if (!message) {
    return NextResponse.json({ ok: false, error: "消息不能为空" }, { status: 400 });
  }
  // 人机验证：会话须先通过验证
  const sessionId = String(body.sessionId || "");
  if (!verifiedSessions.has(sessionId)) {
    return NextResponse.json({ ok: false, needVerify: true, error: "请先完成人机验证" }, { status: 400 });
  }
  const locale = (String(body.locale || "zh")).slice(0, 2);
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.history) ? body.history.slice(-cfg.maxTurns || 8) : [];

  try {
    const siteName = await getSiteName();
    const knowledge = await buildKnowledge(locale);
    // RAG 增强（R3）：按用户问题检索知识库精准条目，追加为「精准知识」
    let ragExtra = "";
    try {
      const { ragRetrieve } = await import("@/lib/ai/orchestrator");
      const hits = await ragRetrieve(message, { locale, limit: 3 });
      if (hits.length) {
        ragExtra = `\n【精准知识（根据用户问题检索）】\n${hits.map((h) => `- ${h.title}：${h.snippet}`).join("\n")}`;
      }
    } catch { /* RAG 不可用时忽略 */ }
    const system = buildSystemPrompt(locale, siteName, knowledge + ragExtra);

    const messages: any[] = [{ role: "system", content: system }];
    for (const h of history) {
      if (h && h.role && h.content) {
        messages.push({ role: h.role === "user" ? "user" : "assistant", content: String(h.content).slice(0, 500) });
      }
    }
    messages.push({ role: "user", content: message });

    const baseUrl = (cfg.baseUrl || "https://api.deepseek.com/v1").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model || "deepseek-chat", temperature: 0.4, max_tokens: 500, messages }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI 客服请求失败:", res.status, t.slice(0, 300));
      return NextResponse.json(
        { ok: false, error: "AI 服务暂时不可用，请稍后再试，或留下联系方式由专人跟进" },
        { status: 502 }
      );
    }
    const data = await res.json();
    const reply = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!reply) {
      return NextResponse.json({ ok: false, error: "AI 返回为空，请稍后再试" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, reply, needHuman: shouldEscalate(message, locale) });
  } catch (e: any) {
    console.error("AI 客服异常:", e);
    return NextResponse.json({ ok: false, error: "AI 服务异常，请稍后再试" }, { status: 500 });
  }
}

/** 人机验证：校验数学验证码并登记会话，登记后本次会话对话免验证 */
async function handleVerify(req: NextRequest) {
  const rl = checkRateLimit("chat_verify", rlIp(req), 10, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }
  const sessionId = String(body.sessionId || "");
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ ok: false, error: "会话无效" }, { status: 400 });
  }
  const captchaId = String(body.captchaId || "");
  const captchaAnswer = String(body.captchaAnswer || "");
  if (!captchaId || !captchaAnswer) {
    return NextResponse.json({ ok: false, error: "请完成验证" }, { status: 400 });
  }
  const expected = consumeCaptcha(captchaId);
  if (expected === null) {
    return NextResponse.json({ ok: false, error: "验证码已过期，请刷新后重试" }, { status: 400 });
  }
  if (expected !== captchaAnswer.trim()) {
    return NextResponse.json({ ok: false, error: "验证码错误" }, { status: 400 });
  }
  verifiedSessions.add(sessionId);
  return NextResponse.json({ ok: true });
}

/** 转人工留资：写入商机台账（contact_messages）+ 邮件通知 */
async function handleLead(req: NextRequest) {
  const rl = checkRateLimit("chat_lead", rlIp(req), 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }
  const clean = (v: any, max: number) => String(v || "").replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, max).trim();
  const name = clean(body.name, 50);
  const phone = clean(body.phone, 20);
  const company = clean(body.company, 100);
  const email = clean(body.email, 100);
  const message = clean(body.message, 1000);
  const locale = String(body.locale || "zh").slice(0, 2);

  if (!name || !phone) {
    return NextResponse.json({ ok: false, error: "姓名与电话必填" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "邮箱格式不正确" }, { status: 400 });
  }

  try {
    const msg = await prisma.contactMessage.create({
      data: {
        name, phone, message: message || `（来自 AI 客服对话，语种 ${locale}）`,
        company: company || null,
        email: email || null,
        subject: "AI客服转人工",
        source: "ai-chat:AI客服",
        status: "new",
      },
    });
    notifyHumanLead({ name, phone, email, company, message, subject: "AI客服转人工" }).catch(() => {});
    return NextResponse.json({ ok: true, id: String(msg.id) });
  } catch (e: any) {
    console.error("AI 客服转人工留资失败:", e);
    return NextResponse.json({ ok: false, error: "提交失败，请稍后再试" }, { status: 500 });
  }
}

/** 站点名称：site_config site_name */
async function getSiteName(): Promise<string> {
  try {
    const sc = await prisma.siteConfig.findUnique({ where: { configKey: "site_name" } });
    if (sc && typeof sc.configValue === "string" && sc.configValue.trim()) return sc.configValue.trim();
  } catch (e) {}
  return (await getBrandInfo()).name;
}
