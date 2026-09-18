import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation } from "@/lib/operation-log";

/**
 * 用户管理 API
 * GET  - 用户列表（含角色）
 * POST - 新增用户
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        userRoles: { include: { role: true } },
        salesProducts: { select: { id: true } },
      },
    });
    return NextResponse.json({ success: true, data: serializeBigInt(users) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "获取用户失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { username, displayName, email, password, roleId, status, isSales, salesOrder, salesProductIds } = body || {};

    const uname = String(username ?? "").trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(uname)) {
      return NextResponse.json({ error: "用户名需为 3-30 位字母/数字/下划线" }, { status: 400 });
    }

    const pwd = String(password ?? "");
    if (pwd.length < 6) {
      return NextResponse.json({ error: "密码长度至少 6 位" }, { status: 400 });
    }

    let mail: string | null = null;
    if (email) {
      const em = String(email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      }
      mail = em;
    }

    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    let role: { id: bigint } | null = null;
    if (roleId) {
      role = await prisma.role.findUnique({ where: { id: BigInt(String(roleId)) } });
    }
    if (!role) {
      role = await prisma.role.findFirst({ where: { name: "admin" } });
    }

    const hash = await bcrypt.hash(pwd, 10);
    const user = await prisma.user.create({
      data: {
        username: uname,
        email: mail,
        displayName: displayName ? String(displayName).trim() : uname,
        passwordHash: hash,
        status: status === "disabled" ? "disabled" : "active",
        isSales: isSales === true || isSales === "true",
        salesOrder: Number.isFinite(Number(salesOrder)) && Number(salesOrder) >= 0 ? Math.floor(Number(salesOrder)) : 0,
        ...(Array.isArray(salesProductIds) && salesProductIds.length > 0
          ? { salesProducts: { connect: salesProductIds.map((x: any) => ({ id: BigInt(String(x)) })) } }
          : {}),
        ...(role ? { userRoles: { create: { roleId: role.id } } } : {}),
      },
      include: { userRoles: { include: { role: true } }, salesProducts: { select: { id: true } } },
    });

    await recordOperation({ module: "users", action: "create", target: String(user.id) });
  return NextResponse.json({ success: true, data: serializeBigInt(user) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "新增用户失败" }, { status: 500 });
  }
}
