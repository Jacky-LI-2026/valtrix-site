import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "tmp", "deploy-uploads");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "仅支持 .zip 格式的代码包" }, { status: 400 });
    }

    // 限制文件大小 200MB
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 200MB" }, { status: 400 });
    }

    // 确保上传目录存在
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `deploy-${timestamp}.zip`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      filePath,
      fileName,
      fileSize: file.size,
      message: "文件上传成功",
    });
  } catch (e: any) {
    console.error("上传部署包失败:", e);
    return NextResponse.json({ error: `上传失败: ${e.message}` }, { status: 500 });
  }
}
