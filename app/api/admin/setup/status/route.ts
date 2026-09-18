import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 系统初始化状态检测
 * 用于判断是否需要首次初始化管理员账号
 */
export async function GET() {
  try {
    const count = await prisma.user.count({ where: { status: "active" } });
    return NextResponse.json({ initialized: count > 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "检测失败" }, { status: 500 });
  }
}
