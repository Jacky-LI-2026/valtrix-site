import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (keyword) {
    where.OR = [
      { quoteNo: { contains: keyword } },
      { name: { contains: keyword } },
      { company: { contains: keyword } },
      { phone: { contains: keyword } },
    ];
  }

  try {
    const total = await prisma.quoteRequest.count({ where });
    const list = await prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const normalized = serializeBigInt(
      list.map((q) => ({
        ...q,
        totalMin: q.totalMin ? Number(q.totalMin) : null,
        totalMax: q.totalMax ? Number(q.totalMax) : null,
      }))
    );
    return NextResponse.json({ list: normalized, total, page, pageSize });
  } catch (error: any) {
    console.error("查询报价单失败:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
