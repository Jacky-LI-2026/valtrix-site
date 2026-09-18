import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runDeployment, getDeploySteps, ServerConfig } from "@/lib/deploy/ssh-deploy";
import { deploySessionManager } from "@/lib/deploy/session-manager";

// BigInt序列化
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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any;
    let uploadPackagePath: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {
        serverId: formData.get("serverId"),
        deployMode: formData.get("deployMode") || "git",
      };
      // 如果直接上传文件
      const file = formData.get("file") as File | null;
      if (file) {
        const { writeFile, mkdir } = await import("fs/promises");
        const path = await import("path");
        const { existsSync } = await import("fs");
        const UPLOAD_DIR = path.join(process.cwd(), "tmp", "deploy-uploads");
        if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
        const fileName = `deploy-${Date.now()}.zip`;
        uploadPackagePath = path.join(UPLOAD_DIR, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(uploadPackagePath, buffer);
        body.deployMode = "upload";
      }
    } else {
      body = await req.json();
      uploadPackagePath = body.uploadPackagePath;
    }

    const { serverId: rawServerId, deployMode } = body;
    const serverId = String(rawServerId ?? "");

    if (!serverId) {
      return NextResponse.json({ error: "请选择服务器" }, { status: 400 });
    }

    if (deployMode === "upload" && !uploadPackagePath) {
      return NextResponse.json({ error: "上传部署模式需要先上传代码包" }, { status: 400 });
    }

    // 获取服务器配置
    const server = await prisma.server.findUnique({
      where: { id: BigInt(serverId) },
    });

    if (!server) {
      return NextResponse.json({ error: "服务器不存在" }, { status: 404 });
    }

    if (!server.isActive) {
      return NextResponse.json({ error: "服务器已禁用" }, { status: 400 });
    }

    const serverConfig: ServerConfig = {
      id: server.id.toString(),
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      privateKey: server.privateKey,
      deployPath: server.deployPath,
      processManager: server.processManager,
      processName: server.processName,
      branch: server.branch,
      deployMode: deployMode || server.deployMode || "git",
      domain: server.domain,
    };

    // 防止同服务器并发部署（前端重复点击/网络重试会多次 start）
    if (deploySessionManager.hasActiveSession(serverConfig.id)) {
      return NextResponse.json({ error: "该服务器已有进行中的部署任务，请等待完成后再试" }, { status: 409 });
    }

    const steps = getDeploySteps(serverConfig);
    
    // 创建部署会话
    const session = deploySessionManager.createSession(
      server.id.toString(),
      server.name,
      steps.length
    );

    // 异步执行部署
    (async () => {
      deploySessionManager.updateStatus(session.id, "running");
      
      const result = await runDeployment(
        serverConfig,
        (log) => {
          deploySessionManager.addLog(session.id, log);
        },
        (stepIndex, totalSteps) => {
          deploySessionManager.updateStep(session.id, stepIndex, totalSteps);
        },
        uploadPackagePath
      );

      deploySessionManager.setResult(session.id, result);
      deploySessionManager.updateStatus(session.id, result.success ? "success" : "failed");
    })();

    return NextResponse.json(serializeBigInt({
      success: true,
      sessionId: session.id,
      message: "部署任务已开始",
      totalSteps: steps.length,
    }));
  } catch (e: any) {
    console.error("启动部署失败:", e);
    return NextResponse.json({ error: `启动部署失败: ${e.message}` }, { status: 500 });
  }
}
