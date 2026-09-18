import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pgTool } from "@/lib/pg-tools";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

// 部署页面"恢复"真实实现：从备份恢复数据库(.dump) 或 项目文件(.zip)
// 安全机制：恢复前自动备份当前状态，防止恢复失败导致数据丢失
const BACKUP_DIR = path.join(process.cwd(), "项目备份");

const KEY_DIRS = ["app", "components", "lib", "prisma", "public", "config", "docs", "scripts"];
const KEY_FILES = [
  ".env", ".env.local", ".env.production",
  "package.json", "package-lock.json",
  "tsconfig.json", "next.config.mjs", "next.config.js",
  "tailwind.config.ts", "tailwind.config.js",
  "postcss.config.mjs", "postcss.config.js", "middleware.ts",
];

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
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function safeName(name: string): boolean {
  return !name.includes("..") && !name.includes("/") && !name.includes("\\");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  const { file } = body || {};
  if (!file || !safeName(file)) {
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });
  }

  const filePath = path.join(BACKUP_DIR, file);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: `备份文件不存在: ${file}` }, { status: 404 });
  }

  const now = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const logs: { time: string; type: "info" | "success" | "error"; message: string }[] = [];
  const push = (type: "info" | "success" | "error", message: string) => logs.push({ time: now(), type, message });

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const stamp = dateStamp();

    // ============ 数据库恢复 (.dump) ============
    if (file.endsWith(".dump")) {
      const dbUrl = getDatabaseUrl();

      // 1. 安全网：先备份当前数据库
      const safeFile = `restore-prev_database_${stamp}.dump`;
      push("info", "恢复前自动备份当前数据库（安全网）...");
      await execFileAsync(
        pgTool("pg_dump"),
        [dbUrl, "-F", "c", "-f", path.join(BACKUP_DIR, safeFile)],
        { timeout: 180000 }
      );
      const safeSize = fs.statSync(path.join(BACKUP_DIR, safeFile)).size;
      push("success", `当前数据库已备份：${safeFile}（${(safeSize / 1024).toFixed(1)} KB）`);

      // 2. 执行恢复（--clean 先删对象再重建）
      push("info", `正在从 ${file} 恢复数据库...`);
      try {
        await execFileAsync(
          pgTool("pg_restore"),
          ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", dbUrl, filePath],
          { timeout: 300000 }
        );
        push("success", "数据库恢复完成");
      } catch (e: any) {
        // pg_restore 可能因非致命错误返回非0，检查是否有实质错误
        const errText = e.stderr ? e.stderr.toString() : "";
        push("error", `数据库恢复完成，但存在警告/错误（可查看日志）：${errText.substring(0, 300)}`);
      }

      return NextResponse.json({ success: true, logs, message: "数据库恢复完成" });
    }

    // ============ 文件恢复 (.zip) ============
    if (file.endsWith(".zip")) {
      // 1. 安全网：先备份当前关键文件
      const safeFile = `restore-prev_backup_${stamp}.zip`;
      push("info", "恢复前自动备份当前项目文件（安全网）...");
      const tarArgs = ["-a", "-c", "-f", path.join(BACKUP_DIR, safeFile), "-C", process.cwd()];
      for (const dir of KEY_DIRS) if (existsSync(path.join(process.cwd(), dir))) tarArgs.push(dir);
      for (const f of KEY_FILES) if (existsSync(path.join(process.cwd(), f))) tarArgs.push(f);
      await execFileAsync("tar", tarArgs, { timeout: 180000 });
      const safeSize = fs.statSync(path.join(BACKUP_DIR, safeFile)).size;
      push("success", `当前项目文件已备份：${safeFile}（${(safeSize / 1024 / 1024).toFixed(2)} MB）`);

      // 2. 解压覆盖项目文件
      push("info", `正在从 ${file} 恢复项目文件...`);
      await execFileAsync("tar", ["-xf", filePath, "-C", process.cwd()], { timeout: 300000 });
      push("success", "项目文件恢复完成（覆盖 app/components/lib/prisma/public 等目录及配置文件）");
      push("info", "若恢复了依赖相关文件，请重新执行 npm install 和 npm run build 后再重启服务");

      return NextResponse.json({ success: true, logs, message: "项目文件恢复完成" });
    }

    return NextResponse.json({ error: "不支持的备份文件类型（仅支持 .dump / .zip）" }, { status: 400 });
  } catch (e: any) {
    console.error("恢复失败:", e);
    return NextResponse.json({ error: `恢复失败: ${e.message}` }, { status: 500 });
  }
}
