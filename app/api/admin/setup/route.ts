import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * 首次初始化：创建第一个管理员账号
 * 仅当系统中没有任何 active 管理员时允许调用
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, password, displayName } = body || {};

    // 已初始化则拒绝（防重复创建）
    const count = await prisma.user.count({ where: { status: "active" } });
    if (count > 0) {
      return NextResponse.json({ error: "系统已初始化，无法重复创建管理员" }, { status: 403 });
    }

    // 校验用户名
    const uname = String(username ?? "").trim();
    if (!uname) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(uname)) {
      return NextResponse.json({ error: "用户名需为 3-30 位字母/数字/下划线" }, { status: 400 });
    }

    // 校验密码
    const pwd = String(password ?? "");
    if (pwd.length < 6) {
      return NextResponse.json({ error: "密码长度至少 6 位" }, { status: 400 });
    }

    // 校验邮箱（可选，若填写需合法）
    let mail: string | null = null;
    if (email) {
      const em = String(email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      }
      mail = em;
    }

    // 用户名唯一性
    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    // 找到 admin 角色（拥有全部权限），作为首个管理员的默认角色
    const adminRole = await prisma.role.findFirst({ where: { name: "admin" } });

    const hash = await bcrypt.hash(pwd, 10);
    const user = await prisma.user.create({
      data: {
        username: uname,
        email: mail,
        displayName: displayName ? String(displayName).trim() : uname,
        passwordHash: hash,
        status: "active",
        ...(adminRole ? { userRoles: { create: { roleId: adminRole.id } } } : {}),
      },
    });

    return NextResponse.json({ success: true, username: user.username });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "初始化失败" }, { status: 500 });
  }
}
