import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// PUT /api/admin/servers/:id - 更新服务器
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const {
      name,
      type,
      host,
      port,
      username,
      password,
      privateKey,
      deployPath,
      processManager,
      processName,
      domain,
      nginxPath,
      branch,
      nodeVersion,
      description,
      isActive,
      sortOrder,
      clearPassword,
      clearPrivateKey,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = port;
    if (username !== undefined) updateData.username = username;
    if (deployPath !== undefined) updateData.deployPath = deployPath;
    if (processManager !== undefined) updateData.processManager = processManager;
    if (processName !== undefined) updateData.processName = processName;
    if (domain !== undefined) updateData.domain = domain;
    if (nginxPath !== undefined) updateData.nginxPath = nginxPath;
    if (branch !== undefined) updateData.branch = branch;
    if (nodeVersion !== undefined) updateData.nodeVersion = nodeVersion;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // 密码处理：只有传入时才更新，clearPassword时清空
    if (clearPassword) {
      updateData.password = null;
    } else if (password !== undefined && password !== "") {
      updateData.password = password;
    }

    // 私钥处理
    if (clearPrivateKey) {
      updateData.privateKey = null;
    } else if (privateKey !== undefined && privateKey !== "") {
      updateData.privateKey = privateKey;
    }

    const server = await prisma.server.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(serializeBigInt({ success: true, id: server.id }));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新服务器失败" }, { status: 500 });
  }
}

// DELETE /api/admin/servers/:id - 删除服务器
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const id = BigInt(params.id);
    await prisma.server.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "删除服务器失败" }, { status: 500 });
  }
}

// GET /api/admin/servers/:id - 获取单个服务器详情（含密码和私钥，用于编辑）
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const id = BigInt(params.id);
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) {
      return NextResponse.json({ error: "服务器不存在" }, { status: 404 });
    }
    return NextResponse.json(serializeBigInt(server));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "获取服务器详情失败" }, { status: 500 });
  }
}
