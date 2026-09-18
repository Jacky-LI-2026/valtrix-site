import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const DEFAULT_OPTIONS = [
  { key: "support", icon: "support", enabled: true, label: { zh: "配套设备及辅材", en: "Supporting Equipment & Materials", ja: "付属設備・副資材", ko: "부속 장비 및 자재", fr: "Équipements & matériaux associés", ar: "المعدات والمواد الداعمة" } },
  { key: "turnkey", icon: "turnkey", enabled: true, label: { zh: "交钥匙工程", en: "Turnkey Engineering", ja: "ターンキーエンジニアリング", ko: "턴키 엔지니어링", fr: "Ingénierie clé en main", ar: "الهندسة المتكاملة" } },
  { key: "training", icon: "training", enabled: true, label: { zh: "工艺培训包", en: "Process Training Package", ja: "プロセス研修パッケージ", ko: "공정 교육 패키지", fr: "Pack de formation process", ar: "حزمة التدريب التقني" } },
  { key: "custom", icon: "custom", enabled: true, label: { zh: "定制化服务", en: "Customization Service", ja: "カスタマイズサービス", ko: "맞춤형 서비스", fr: "Service de personnalisation", ar: "خدمة التخصيص" } },
  { key: "other", icon: "other", enabled: true, label: { zh: "其他需求", en: "Other Requirements", ja: "その他のご要望", ko: "기타 요구사항", fr: "Autres besoins", ar: "احتياجات أخرى" } },
];

const DEFAULT_TEMPLATE = {
  headerName: "",
  headerNameEn: "",
  logo: "",
  primaryColor: "#CC0000",
  quoteTitle: "报价单 QUOTATION",
  showPriceRange: true,
  validityDays: 15,
  footerText: "本报价单仅供参考，最终价格与交货期以双方书面确认为准。",
  options: DEFAULT_OPTIONS,
};

/** GET 报价单模板配置 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: "quote_template" } });
    let cfg = { ...DEFAULT_TEMPLATE };
    if (row && row.configValue) {
      try {
        const raw = row.configValue as unknown
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
        if (parsed && typeof parsed === "object") cfg = { ...DEFAULT_TEMPLATE, ...parsed };
      } catch (e) {}
    }
    return NextResponse.json({ success: true, data: cfg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "读取失败" }, { status: 500 });
  }
}

/** PUT 保存报价单模板配置 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    // 规范化附加需求选项（保留多语 label + enabled + icon）
    const normalizeOptions = (raw: any) => {
      if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_OPTIONS;
      return raw.map((o: any, idx: number) => {
        const base = DEFAULT_OPTIONS[idx] || {};
        return {
          key: String(o?.key || base.key || "opt_" + idx).slice(0, 40),
          icon: String(o?.icon || base.icon || "other").slice(0, 40),
          enabled: o?.enabled !== false,
          label: {
            zh: String(o?.label?.zh || base.label?.zh || o?.label || "").slice(0, 80),
            en: String(o?.label?.en || base.label?.en || "").slice(0, 120),
            ja: String(o?.label?.ja || base.label?.ja || "").slice(0, 120),
            ko: String(o?.label?.ko || base.label?.ko || "").slice(0, 120),
            fr: String(o?.label?.fr || base.label?.fr || "").slice(0, 120),
            ar: String(o?.label?.ar || base.label?.ar || "").slice(0, 120),
          },
        };
      });
    };
    const cfg = {
      headerName: String(body.headerName || "").trim(),
      headerNameEn: String(body.headerNameEn || "").trim(),
      logo: String(body.logo || "").trim(),
      primaryColor: /^#[0-9a-fA-F]{3,6}$/.test(String(body.primaryColor || "")) ? String(body.primaryColor) : "#CC0000",
      quoteTitle: String(body.quoteTitle || "报价单 QUOTATION").trim(),
      showPriceRange: body.showPriceRange !== false,
      validityDays: Math.max(0, parseInt(String(body.validityDays || "0"), 10) || 0),
      footerText: String(body.footerText || "").trim(),
      options: normalizeOptions(body.options),
    };
    await prisma.siteConfig.upsert({
      where: { configKey: "quote_template" },
      update: { configValue: JSON.stringify(cfg) },
      create: { configKey: "quote_template", configValue: JSON.stringify(cfg) },
    });
    return NextResponse.json({ success: true, data: cfg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "保存失败" }, { status: 500 });
  }
}
