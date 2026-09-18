import { NextResponse } from "next/server";
import { getClientIp as rlIp, checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { getClientIp, getLocationFields } from '@/lib/geo'
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/download-lead
 * 前台下载申请（审核模式）：验证通过后创建一条"待审核"留资，后台确认通过后才开放下载。
 * body: { email, name, company, phone, resourceType, resourceKey, resourceName, downloadUrl }
 */
export async function POST(req: Request) {
  const rlIpAddr = rlIp(req);
  const rl = checkRateLimit("download_lead", rlIpAddr, 5, 60000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const company = String(body.company || "").trim();
  const phone = String(body.phone || "").trim();
  const resourceType = String(body.resourceType || "resource").trim();
  const resourceKey = String(body.resourceKey || "").trim() || null;
  const resourceName = String(body.resourceName || "").trim();
  const downloadUrl = String(body.downloadUrl || "").trim();

  if (!email || !name || !phone) {
    return NextResponse.json({ ok: false, message: "参数不完整" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "邮箱格式不正确" }, { status: 400 });
  }

  try {
    // 同一邮箱+资源已有"待审核/已通过"记录时不重复创建，避免刷单
    const existing = await prisma.downloadLead.findFirst({
      where: {
        email,
        resourceType,
        ...(resourceKey ? { resourceKey } : {}),
        status: { in: ["pending", "approved"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({ ok: true, leadId: String(existing.id), status: existing.status });
    }

    const _loc = getLocationFields(getClientIp(req.headers));
    const lead = await prisma.downloadLead.create({
      data: {
        email,
        name,
        company,
        phone,
        resourceType,
        resourceKey,
        resourceName,
        downloadUrl,
        status: "pending",
        ip: _loc.ip,
        country: _loc.country,
        city: _loc.city,      },
    });
    // EDM 订阅者自动收集（下载留资邮箱）
    try {
      const { ensureEmailSubscriber } = await import("@/lib/email-subscriber");
      await ensureEmailSubscriber(email, "下载留资", `download-lead:${resourceType}`, name || undefined);
    } catch { /* 静默 */ }
    return NextResponse.json({ ok: true, leadId: String(lead.id), status: "pending" });
  } catch (e) {
    console.error("创建下载留资失败:", (e as Error).message);
    return NextResponse.json({ ok: false, message: "提交失败，请稍后再试" }, { status: 500 });
  }
}
