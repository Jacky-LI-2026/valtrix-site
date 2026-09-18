/**
 * 通用表单 · 前台提交 API
 * POST /api/public/forms/[slug] 校验 + 入库 + IP 地理信息
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getLocationFields } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const form = await prisma.formDefinition.findUnique({ where: { slug: params.slug } });
    if (!form || form.status !== "active") return NextResponse.json({ error: "表单不存在或已停用" }, { status: 404 });
    const body = await req.json();
    const fields: any[] = Array.isArray(form.fields) ? (form.fields as any) : [];

    // 必填校验
    for (const f of fields) {
      if (f.required) {
        const v = body[f.key];
        if (v === undefined || v === null || String(v).trim() === "" || (Array.isArray(v) && v.length === 0)) {
          return NextResponse.json({ error: `请填写「${f.label?.zh || f.key}」` }, { status: 400 });
        }
      }
    }

    // 邮箱/电话格式校验
    for (const f of fields) {
      const v = String(body[f.key] ?? "");
      if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json({ error: `「${f.label?.zh || f.key}」邮箱格式不正确` }, { status: 400 });
      }
      if (v && f.type === "tel" && !/^[+0-9\-\s()]{6,20}$/.test(v)) {
        return NextResponse.json({ error: `「${f.label?.zh || f.key}」电话格式不正确` }, { status: 400 });
      }
    }

    const fieldData: any = {};
    for (const f of fields) fieldData[f.key] = body[f.key];

    const ip = getClientIp(req.headers);
    const loc = getLocationFields(ip);
    const created = await prisma.formSubmission.create({
      data: { formId: form.id, fieldData, ip: loc.ip, country: loc.country, city: loc.city },
    });
    // 计数
    await prisma.formDefinition.update({ where: { id: form.id }, data: { submitCount: { increment: 1 } } });
    // 事件总线：商机产生 → 订阅者（SMTP 通知等）
    try {
      const { ensurePlugins } = await import("@/lib/plugins/ensure");
      ensurePlugins();
      const { emit } = await import("@/lib/plugins/events");
      await emit("lead.submitted", { channel: `表单·${form.name}`, data: { ...fieldData, ...loc } });
    } catch { /* 事件不阻断主流程 */ }
    return NextResponse.json({ ok: true, id: String(created.id) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
