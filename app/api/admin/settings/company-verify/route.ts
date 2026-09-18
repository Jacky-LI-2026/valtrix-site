import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseConfig(v: any): any {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v || {};
}

/** GET /api/admin/settings/company-verify — 读取公司名称核实配置 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const db = await prisma.siteConfig.findUnique({ where: { configKey: "company_verify_config" } });
    const c = db ? parseConfig(db.configValue) : {};
    return NextResponse.json({ ok: true, config: { enabled: c?.enabled !== false, strict: c?.strict !== false } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}

/** POST /api/admin/settings/company-verify — 保存配置 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const next = {
      enabled: body?.enabled === true || body?.enabled === "true" || body?.enabled === 1 || body?.enabled === "1",
      strict: body?.strict === true || body?.strict === "true" || body?.strict === 1 || body?.strict === "1",
    };
    await prisma.siteConfig.upsert({
      where: { configKey: "company_verify_config" },
      update: { configValue: next },
      create: { configKey: "company_verify_config", configValue: next },
    });
    return NextResponse.json({ ok: true, message: "公司名称核实配置已保存" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}
