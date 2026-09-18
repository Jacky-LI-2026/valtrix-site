import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// BigInt序列化辅助函数
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

// GET /api/admin/servers - 获取服务器列表
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const servers = await prisma.server.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    // 不返回密码和私钥
    const safeServers = servers.map(({ password, privateKey, ...rest }) => ({
      ...rest,
      hasPassword: !!password,
      hasPrivateKey: !!privateKey,
    }));
    return NextResponse.json(serializeBigInt(safeServers));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "获取服务器列表失败" }, { status: 500 });
  }
}

// POST /api/admin/servers - 创建服务器
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
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
    } = body;

    if (!name || !host || !username || !deployPath) {
      return NextResponse.json({ error: "服务器名称、主机、用户名、部署路径为必填项" }, { status: 400 });
    }

    const server = await prisma.server.create({
      data: {
        name,
        type: type || "other",
        host,
        port: port || 22,
        username,
        password: password || null,
        privateKey: privateKey || null,
        deployPath,
        processManager: processManager || "pm2",
        processName: processName || null,
        domain: domain || null,
        nginxPath: nginxPath || null,
        branch: branch || "main",
        nodeVersion: nodeVersion || null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(serializeBigInt({ id: server.id, success: true }));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建服务器失败" }, { status: 500 });
  }
}
