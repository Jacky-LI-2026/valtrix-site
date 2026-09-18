/**
 * 通用表单 · 提交记录 API
 * GET /api/admin/forms/[id]/submissions 分页 + 导出 CSV
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 20;
    const where = { formId: id };
    const total = await prisma.formSubmission.count({ where });
    const list = await prisma.formSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize });

    if (searchParams.get("format") === "csv") {
      const form = await prisma.formDefinition.findUnique({ where: { id } });
      const fields: any[] = Array.isArray(form?.fields) ? (form.fields as any) : [];
      const all = await prisma.formSubmission.findMany({ where, orderBy: { createdAt: "desc" } });
      const head = ["提交时间", "IP", "国家", "城市", ...fields.map((f) => f.key)];
      const rows = all.map((s) => {
        const fd: any = s.fieldData || {};
        return [new Date(s.createdAt).toLocaleString("zh-CN"), s.ip || "", s.country || "", s.city || "", ...fields.map((f) => String(fd[f.key] ?? ""))];
      });
      const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [head.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
      return new NextResponse("\uFEFF" + csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="form-${form?.slug || id}.csv"` },
      });
    }
    return NextResponse.json(serializeBigInt({ list, total, page, pageSize }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
