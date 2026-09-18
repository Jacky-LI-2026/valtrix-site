import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_OPTIONS = [
  { key: "support", icon: "support", enabled: true, label: { zh: "配套设备及辅材", en: "Supporting Equipment & Materials", ja: "付属設備・副資材", ko: "부속 장비 및 자재", fr: "Équipements & matériaux associés", ar: "المعدات والمواد الداعمة" } },
  { key: "turnkey", icon: "turnkey", enabled: true, label: { zh: "交钥匙工程", en: "Turnkey Engineering", ja: "ターンキーエンジニアリング", ko: "턴키 엔지니어링", fr: "Ingénierie clé en main", ar: "الهندسة المتكاملة" } },
  { key: "training", icon: "training", enabled: true, label: { zh: "工艺培训包", en: "Process Training Package", ja: "プロセス研修パッケージ", ko: "공정 교육 패키지", fr: "Pack de formation process", ar: "حزمة التدريب التقني" } },
  { key: "custom", icon: "custom", enabled: true, label: { zh: "定制化服务", en: "Customization Service", ja: "カスタマイズサービス", ko: "맞춤형 서비스", fr: "Service de personnalisation", ar: "خدمة التخصيص" } },
  { key: "other", icon: "other", enabled: true, label: { zh: "其他需求", en: "Other Requirements", ja: "その他のご要望", ko: "기타 요구사항", fr: "Autres besoins", ar: "احتياجات أخرى" } },
];

/** GET 询价附加需求选项（公开，供前台询价车渲染，多语） */
export async function GET() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: "quote_template" } });
    let options = DEFAULT_OPTIONS;
    if (row && row.configValue) {
      try {
        const raw = row.configValue as unknown
        const cfg = typeof raw === "string" ? JSON.parse(raw) : raw
        if (Array.isArray(cfg?.options)) options = cfg.options;
      } catch (e) {}
    }
    return NextResponse.json({ success: true, data: options });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "读取失败" }, { status: 500 });
  }
}
