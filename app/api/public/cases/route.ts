import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";

// 前台案例列表：?industry=xx&featured=1&limit=n&status 默认 published
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const industry = sp.get("industry") || "";
    const featured = sp.get("featured");
    const limit = Math.min(Number(sp.get("limit")) || 50, 100);
    const where: any = { status: "published" };
    if (industry) {
      where.OR = [{ industry }, { industryEn: industry }];
    }
    if (featured === "1") where.featured = true;
    const items = await prisma.case.findMany({
      where,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "desc" }],
      take: limit,
    });
    return NextResponse.json(serializeBigInt(items));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
