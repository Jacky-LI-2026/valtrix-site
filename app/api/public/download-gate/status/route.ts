import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/public/download-gate/status?email=xx&resourceType=solution&resourceKey=jewelry
 * 查询当前用户对某资源的下载审核状态：
 *  - approved  已通过 → 可下载
 *  - pending   待审核
 *  - rejected  已拒绝
 *  - none      无记录（未申请或历史即时下载）
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  const resourceType = String(url.searchParams.get("resourceType") || "resource").trim();
  const resourceKey = String(url.searchParams.get("resourceKey") || "").trim() || null;

  if (!email) {
    return NextResponse.json({ ok: false, message: "缺少 email" }, { status: 400 });
  }

  try {
    const lead = await prisma.downloadLead.findFirst({
      where: {
        email,
        resourceType,
        ...(resourceKey ? { resourceKey } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (!lead) {
      return NextResponse.json({ ok: true, status: "none" });
    }
    return NextResponse.json({
      ok: true,
      status: lead.status,
      leadId: String(lead.id),
      createdAt: lead.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("查询下载审核状态失败:", (e as Error).message);
    return NextResponse.json({ ok: false, message: "查询失败" }, { status: 500 });
  }
}
