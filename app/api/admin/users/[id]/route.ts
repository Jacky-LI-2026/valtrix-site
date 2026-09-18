import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { recordOperation } from "@/lib/operation-log";

/**
 * 用户管理 API（单个用户）
 * PUT    - 编辑用户（含角色/状态/可选改密码）
 * DELETE - 删除用户（禁止删除当前登录账号）
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const id = BigInt(String(params.id));
    const body = await req.json().catch(() => ({}));
    const { displayName, email, password, roleId, status, isSales, salesOrder, salesProductIds } = body || {};

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (displayName !== undefined) {
      data.displayName = String(displayName).trim() || existing.displayName;
    }

    if (email !== undefined) {
      const em = String(email).trim();
      if (em) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
        }
        const dup = await prisma.user.findFirst({ where: { email: em, NOT: { id } } });
        if (dup) {
          return NextResponse.json({ error: "该邮箱已被其他账号使用" }, { status: 409 });
        }
        data.email = em;
      } else {
        data.email = null;
      }
    }

    if (password) {
      const pwd = String(password);
      if (pwd.length < 6) {
        return NextResponse.json({ error: "密码长度至少 6 位" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(pwd, 10);
    }

    if (status !== undefined) {
      data.status = status === "disabled" ? "disabled" : "active";
    }

    if (isSales !== undefined) {
      data.isSales = isSales === true || isSales === "true";
    }
    if (salesOrder !== undefined) {
      const so = Number(salesOrder);
      data.salesOrder = Number.isFinite(so) && so >= 0 ? Math.floor(so) : 0;
    }

    // 角色变更（先删后建，保持单一角色）
    if (roleId !== undefined && roleId !== null && roleId !== "") {
      const role = await prisma.role.findUnique({ where: { id: BigInt(String(roleId)) } });
      if (!role) {
        return NextResponse.json({ error: "角色不存在" }, { status: 400 });
      }
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
    } else if (roleId === null || roleId === "") {
      await prisma.userRole.deleteMany({ where: { userId: id } });
    }

    const user = await prisma.$transaction(async (tx) => {
      // 销售绑定产品（全量替换）
      if (salesProductIds !== undefined) {
        const ids = Array.isArray(salesProductIds) ? salesProductIds.map((x: any) => { try { return BigInt(String(x)); } catch { return null; } }).filter(Boolean) : [];
        await tx.user.update({ where: { id }, data: { salesProducts: { set: [] } } });
        if (ids.length > 0) {
          await tx.user.update({ where: { id }, data: { salesProducts: { connect: ids.map((pid) => ({ id: pid as bigint })) } } });
        }
      }
      return tx.user.update({
        where: { id },
        data,
        include: { userRoles: { include: { role: true } }, salesProducts: { select: { id: true } } },
      });
    });

    await recordOperation({ module: "users", action: "update", target: String(params.id) });
  return NextResponse.json({ success: true, data: serializeBigInt(user) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新用户失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const id = BigInt(String(params.id));
    const currentUserId = (session.user as any).id;

    if (currentUserId && BigInt(String(currentUserId)) === id) {
      return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await recordOperation({ module: "users", action: "delete", target: String(params.id) });
  return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "删除用户失败" }, { status: 500 });
  }
}
