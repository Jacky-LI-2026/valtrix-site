import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * 维护模式配置（owner 2026-09-26 确认）
 * ==========================================================================
 * 单一真源：`site_config.configKey = 'maintenance'`（Json）。
 * 读这一份的还有 Node 层的拦截器 `lib/server/maintenance.js`（5 秒缓存，开启/关闭最多 5 秒生效）。
 * 鉴权：本接口必须被 middleware 的 API_PERMISSION 收口（`config:site`），此处再校验一次会话。
 */
const KEY = "maintenance";
const LANGS = ["zh", "en", "ja", "ko", "fr", "ar"] as const;

/** 默认文案（六语种）。⚠️ 不能 `export`：Next 路由文件只允许导出 HTTP 方法等固定字段 */
const DEFAULT_MAINTENANCE = {
  enabled: false,
  title: { zh: "网站维护中", en: "Site under maintenance", ja: "サイトメンテナンス中", ko: "사이트 점검 중", fr: "Site en maintenance", ar: "الموقع تحت الصيانة" },
  message: {
    zh: "我们正在对网站进行升级维护，预计很快恢复。给您带来不便，敬请谅解。",
    en: "We are performing scheduled maintenance and will be back shortly. Sorry for the inconvenience.",
    ja: "現在、サイトのメンテナンスを行っております。まもなく再開いたします。ご不便をおかけします。",
    ko: "현재 사이트 점검 중입니다. 곧 정상화됩니다. 불편을 드려 죄송합니다.",
    fr: "Nous effectuons une maintenance. Le site sera de nouveau disponible très prochainement.",
    ar: "نقوم حالياً بأعمال الصيانة وسيعود الموقع قريباً. نعتذر عن الإزعاج.",
  },
  eta: "",
  contact: "",
  bypassIps: [] as string[],
};

/** 补齐缺失字段（老配置/手工改库都能安全读出） */
function normalize(raw: any) {
  const out: any = { ...DEFAULT_MAINTENANCE, ...(raw || {}) };
  out.enabled = raw?.enabled === true;
  out.title = { ...DEFAULT_MAINTENANCE.title, ...(raw?.title || {}) };
  out.message = { ...DEFAULT_MAINTENANCE.message, ...(raw?.message || {}) };
  out.eta = typeof raw?.eta === "string" ? raw.eta : "";
  out.contact = typeof raw?.contact === "string" ? raw.contact : "";
  out.bypassIps = Array.isArray(raw?.bypassIps) ? raw.bypassIps.map((x: any) => String(x).trim()).filter(Boolean) : [];
  return out;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: KEY } });
    return NextResponse.json({ ok: true, config: normalize(row?.configValue) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "读取失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const config = normalize(body);
    // 只接受六语种键，避免把任意 JSON 写进库
    const cleanLang = (o: any) => Object.fromEntries(LANGS.map((l) => [l, String(o?.[l] ?? "").slice(0, 2000)]));
    const value = {
      enabled: config.enabled === true,
      title: cleanLang(config.title),
      message: cleanLang(config.message),
      eta: String(config.eta).slice(0, 200),
      contact: String(config.contact).slice(0, 200),
      bypassIps: config.bypassIps.slice(0, 50),
      updatedAt: new Date().toISOString(),
    };
    await prisma.siteConfig.upsert({
      where: { configKey: KEY },
      update: { configValue: value, remark: "维护模式（前台 503）" },
      create: { configKey: KEY, configValue: value, remark: "维护模式（前台 503）" },
    });
    return NextResponse.json({ ok: true, config: value });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "保存失败" }, { status: 500 });
  }
}
