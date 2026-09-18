import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LegacyLead {
  email: string;
  name: string;
  company: string;
  phone: string;
  resourceName?: string;
  downloadUrl?: string;
  verifiedAt: string;
}

interface LeadRow {
  id?: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  resourceName?: string;
  downloadUrl?: string;
  resourceType?: string;
  resourceKey?: string;
  status: string; // pending / approved / rejected / approved（历史即时）
  remark?: string;
  source: "db" | "jsonl";
  createdAt: string;
  verifiedAt?: string;
}

/** 读取历史下载留资 JSONL（即时下载模式遗留），标为已放行 */
async function readLegacyLeads(): Promise<LeadRow[]> {
  const filePath = path.join(process.cwd(), "data", "download-leads.jsonl");
  let raw = "";
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return [];
  }
  const rows: LeadRow[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const l = JSON.parse(line) as LegacyLead;
      rows.push({
        email: l.email,
        name: l.name,
        company: l.company,
        phone: l.phone,
        resourceName: l.resourceName,
        downloadUrl: l.downloadUrl,
        status: "approved",
        source: "jsonl",
        createdAt: l.verifiedAt,
        verifiedAt: l.verifiedAt,
      });
    } catch {
      // 跳过损坏行
    }
  }
  return rows;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const [dbLeads, legacyLeads] = await Promise.all([
    prisma.downloadLead.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    readLegacyLeads(),
  ]);

  const dbRows: LeadRow[] = dbLeads.map((l) => ({
    id: String(l.id),
    email: l.email,
    name: l.name,
    company: l.company,
    phone: l.phone,
    resourceName: l.resourceName || "",
    downloadUrl: l.downloadUrl || "",
    resourceType: l.resourceType,
    resourceKey: l.resourceKey || "",
    status: l.status,
    remark: l.remark || "",
    source: "db",
    createdAt: l.createdAt.toISOString(),
  }));

  // 合并并按时间倒序
  const leads = [...dbRows, ...legacyLeads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const manualCount = await prisma.siteConfig
    .findUnique({ where: { configKey: "manual_download_count" }, select: { configValue: true } })
    .then((c) => Number(c?.configValue ?? 0))
    .catch(() => 0);

  if (format === "csv") {
    const header = ["时间", "邮箱", "姓名", "公司", "电话", "下载资料", "下载链接", "状态"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const statusText: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝" };
    const rows = leads.map((l) =>
      [l.createdAt, l.email, l.name, l.company, l.phone, l.resourceName || "", l.downloadUrl || "", statusText[l.status] || l.status]
        .map(esc)
        .join(",")
    );
    const csv = "\uFEFF" + header.map(esc).join(",") + "\n" + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="下载留资记录.csv"`,
      },
    });
  }

  const stats = {
    total: leads.length,
    today: leads.filter((l) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
    pendingCount: dbRows.filter((l) => l.status === "pending").length,
    manualCount,
  };
  return NextResponse.json({ ok: true, stats, leads });
}
