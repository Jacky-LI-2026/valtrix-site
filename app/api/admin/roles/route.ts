import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation, pickTarget } from "@/lib/operation-log";

/**
 * 角色管理 API
 * GET  - 角色列表（含权限数、用户数）
 * POST - 新建角色（含权限分配）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const perms = (session.user as any).permissions || [];
  if (!perms.includes("system:role")) {
    return NextResponse.json({ error: "无权限：需要「角色管理」权限" }, { status: 403 });
  }
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });
    return NextResponse.json({ success: true, data: serializeBigInt(roles) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "获取角色失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const perms = (session.user as any).permissions || [];
  if (!perms.includes("system:role")) {
    return NextResponse.json({ error: "无权限：需要「角色管理」权限" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { name, displayName, description, permissionIds } = body || {};

    const rname = String(name ?? "").trim();
    if (!/^[a-zA-Z0-9_]{2,30}$/.test(rname)) {
      return NextResponse.json({ error: "角色标识需为 2-30 位字母/数字/下划线" }, { status: 400 });
    }
    const dname = String(displayName ?? "").trim();
    if (!dname) {
      return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
    }

    const exists = await prisma.role.findUnique({ where: { name: rname } });
    if (exists) {
      return NextResponse.json({ error: "角色标识已存在" }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name: rname,
        displayName: dname,
        description: description ? String(description).slice(0, 200) : null,
        ...(Array.isArray(permissionIds) && permissionIds.length
          ? { rolePermissions: { create: permissionIds.map((pid: any) => ({ permissionId: BigInt(String(pid)) })) } }
          : {}),
      },
      include: { rolePermissions: { include: { permission: true } } },
    });

    await recordOperation({ module: "roles", action: "create", target: pickTarget(body) });
  return NextResponse.json({ success: true, data: serializeBigInt(role) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "新建角色失败" }, { status: 500 });
  }
}
