import { NextRequest, NextResponse } from "next/server";
import { getCompanyVerifyConfig, isChineseCompanyName, verifyChineseCompany } from "@/lib/company-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/company-verify — 询价表单公司名称预检
 * body: { name: string }
 * 返回: { ok, skip?, verified, exists, confidence, reason, message }
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const company = String(body?.name || "").trim();
    if (!company) {
      return NextResponse.json({ ok: true, skip: true, message: "未填写公司名称" });
    }
    const cfg = await getCompanyVerifyConfig();
    if (!cfg.enabled) {
      return NextResponse.json({ ok: true, skip: true, message: "公司名称核实未启用" });
    }
    if (!isChineseCompanyName(company)) {
      return NextResponse.json({ ok: true, skip: true, message: "非中国企业名称，无需核实" });
    }
    const r = await verifyChineseCompany(company);
    const strict = cfg.strict;
    const pass = r.verified || (!strict && r.exists === null);
    return NextResponse.json({
      ok: pass,
      verified: r.verified,
      exists: r.exists,
      confidence: r.confidence,
      reason: r.reason,
      message: pass
        ? "公司名称核实通过"
        : r.reason || "未能核实该公司的真实性，请确认公司名称后重试",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "公司核实服务异常，请稍后重试" }, { status: 500 });
  }
}
