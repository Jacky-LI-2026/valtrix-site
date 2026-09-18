import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pgTool } from "@/lib/pg-tools";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

// 部署页面的"一键备份（数据库+文件）"真实实现
// 数据库备份：pg_dump 生成 .dump；文件备份：tar 打包关键文件为 .zip
const BACKUP_DIR = path.join(process.cwd(), "项目备份");

// 需要打包的关键目录与文件（不含 node_modules / .next / 备份目录）
const KEY_DIRS = ["app", "components", "lib", "prisma", "public", "config", "docs", "scripts"];
const KEY_FILES = [
  ".env", ".env.local", ".env.production",
  "package.json", "package-lock.json",
  "tsconfig.json", "next.config.mjs", "next.config.js",
  "tailwind.config.ts", "tailwind.config.js",
  "postcss.config.mjs", "postcss.config.js", "middleware.ts",
];

// 读取 .env 中的 DATABASE_URL（去掉 Prisma 专用 query 参数）
function getDatabaseUrl(): string {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const m = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
  if (!m) throw new Error("未找到 DATABASE_URL 配置");
  return m[1].trim().split("?")[0];
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

// 列出备份目录中的备份文件
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const entries = await readdir(BACKUP_DIR);
    const backups: any[] = [];

    for (const name of entries) {
      // 只识别数据库 dump 和本项目备份 zip
      if (!/^(database_\d{8}\.dump|backup_\d{8}\.zip|[^_/\\\\]{1,20}网站_关键备份_[\d_]+\.zip)$/.test(name)) continue;
      const full = path.join(BACKUP_DIR, name);
      try {
        const st = await stat(full);
        if (st.isFile()) {
          backups.push({ name, size: st.size, modified: st.mtime.toISOString() });
        }
      } catch {}
    }

    backups.sort((a, b) => b.name.localeCompare(a.name));
    return NextResponse.json({ backups });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 执行一键备份：数据库 dump + 文件 zip
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const ds = dateStamp();
    const dbFileName = `database_${ds}.dump`;
    const zipFileName = `backup_${ds}.zip`;
    const dbPath = path.join(BACKUP_DIR, dbFileName);
    const zipPath = path.join(BACKUP_DIR, zipFileName);
    const logs: { time: string; type: string; message: string }[] = [];
    const now = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });

    // 1. 数据库备份（pg_dump 自定义格式）
    logs.push({ time: now(), type: "info", message: "开始备份数据库..." });
    await execFileAsync(
      pgTool("pg_dump"),
      [getDatabaseUrl(), "-F", "c", "-f", dbPath],
      { timeout: 180000 }
    );
    const dbSize = fs.statSync(dbPath).size;
    logs.push({ time: now(), type: "success", message: `数据库备份完成：${dbFileName}（${(dbSize / 1024).toFixed(1)} KB）` });

    // 2. 文件备份（tar 打包关键文件）
    logs.push({ time: now(), type: "info", message: "开始备份项目文件..." });
    const tarArgs = ["-a", "-c", "-f", zipPath, "-C", process.cwd()];
    for (const dir of KEY_DIRS) {
      if (existsSync(path.join(process.cwd(), dir))) tarArgs.push(dir);
    }
    for (const file of KEY_FILES) {
      if (existsSync(path.join(process.cwd(), file))) tarArgs.push(file);
    }
    await execFileAsync("tar", tarArgs, { timeout: 180000 });
    const zipSize = fs.statSync(zipPath).size;
    logs.push({ time: now(), type: "success", message: `文件备份完成：${zipFileName}（${(zipSize / 1024 / 1024).toFixed(2)} MB）` });

    logs.push({ time: now(), type: "success", message: `备份完成，文件已保存到项目备份目录` });

    return NextResponse.json({
      success: true,
      files: [dbFileName, zipFileName],
      logs,
      message: "一键备份完成",
    });
  } catch (e: any) {
    console.error("一键备份失败:", e);
    return NextResponse.json({ error: `备份失败: ${e.message}` }, { status: 500 });
  }
}

// 下载备份文件
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");
    if (!fileName) return NextResponse.json({ error: "未指定文件" }, { status: 400 });
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return NextResponse.json({ error: "非法文件名" }, { status: 400 });
    }
    const filePath = path.join(BACKUP_DIR, fileName);
    const data = fs.readFileSync(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
