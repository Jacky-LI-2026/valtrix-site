import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation } from "@/lib/operation-log";

/**
 * 角色管理 API（单个角色）
 * PUT    - 更新角色（名称/权限，admin 角色不可改标识）
 * DELETE - 删除角色（admin 角色禁止删、关联用户时禁止删）
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const perms = (session.user as any).permissions || [];
  if (!perms.includes("system:role")) {
    return NextResponse.json({ error: "无权限：需要「角色管理」权限" }, { status: 403 });
  }
  try {
    const id = BigInt(String(params.id));
    const body = await req.json().catch(() => ({}));
    const { displayName, description, permissionIds } = body || {};

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const data: Record<string, any> = {};
    if (displayName !== undefined) {
      const dname = String(displayName).trim();
      if (!dname) return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
      data.displayName = dname;
    }
    if (description !== undefined) {
      data.description = description ? String(description).slice(0, 200) : null;
    }

    const role = await prisma.role.update({
      where: { id },
      data,
      include: { rolePermissions: { include: { permission: true } } },
    });

    // 权限全量替换（admin 角色例外：不允许缩权限，避免锁死系统）
    if (Array.isArray(permissionIds)) {
      if (existing.name === "admin") {
        // admin 保持全部权限：把缺失的补上，忽略勾选结果
        const all = await prisma.permission.findMany();
        for (const perm of all) {
          const ex = await prisma.rolePermission.findUnique({
            where: { roleId_permissionId: { roleId: id, permissionId: perm.id } },
          });
          if (!ex) await prisma.rolePermission.create({ data: { roleId: id, permissionId: perm.id } });
        }
      } else {
        await prisma.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length) {
          await prisma.rolePermission.createMany({
            data: permissionIds.map((pid: any) => ({ roleId: id, permissionId: BigInt(String(pid)) })),
          });
        }
      }
    }

    const updated = await prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    await recordOperation({ module: "roles", action: "update", target: String(params.id) });
  return NextResponse.json({ success: true, data: serializeBigInt(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新角色失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const perms = (session.user as any).permissions || [];
  if (!perms.includes("system:role")) {
    return NextResponse.json({ error: "无权限：需要「角色管理」权限" }, { status: 403 });
  }
  try {
    const id = BigInt(String(params.id));
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }
    if (existing.name === "admin") {
      return NextResponse.json({ error: "系统内置的「管理员」角色不可删除" }, { status: 400 });
    }
    const userCount = await prisma.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      return NextResponse.json({ error: `该角色已关联 ${userCount} 个用户，请先调整用户角色后再删除` }, { status: 400 });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    await recordOperation({ module: "roles", action: "delete", target: String(params.id) });
  return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "删除角色失败" }, { status: 500 });
  }
}
