import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "all";
  try {
    const where: any = {};
    if (status !== "all") where.status = status;
    const [items, total, pending] = await Promise.all([
      prisma.visitBooking.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.visitBooking.count(),
      prisma.visitBooking.count({ where: { status: "pending" } }),
    ]);
    return NextResponse.json(serializeBigInt({ items, stats: { total, pending } }));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    const item = await prisma.visitBooking.update({ where: { id }, data });
    return NextResponse.json(serializeBigInt(item));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const id = Number(sp.get("id"));
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  try {
    await prisma.visitBooking.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
