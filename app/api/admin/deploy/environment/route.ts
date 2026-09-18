import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import os from "os";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/auth";

// 实时环境检测：禁止 Next.js 缓存（否则返回构建/首次请求时的旧数据）
export const dynamic = "force-dynamic";

// 解析 package.json 中的依赖版本
function getPkgVersion(dep: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    return (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep] || "未知").replace(/[\^~]/g, "");
  } catch {
    return "未知";
  }
}

function parseMajor(ver: string): number {
  const m = ver.match(/(\d+)\./);
  return m ? parseInt(m[1], 10) : 0;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const info: Record<string, any> = {};
  const checks: any[] = [];

  // ===== 建议运行环境（静态推荐） =====
  const recommended = {
    os: "Ubuntu 22.04 LTS / CentOS 8+",
    node: "Node.js v18+（推荐 v20 LTS，用 nvm 管理）",
    postgres: "PostgreSQL 14+（推荐 15/16）",
    memory: "≥ 4GB（标准型建议 8GB）",
    cpu: "≥ 2核（标准型建议 4核）",
    disk: "≥ 20GB（建议 40GB+ SSD）",
    process: "PM2（进程守护 + 开机自启）",
    proxy: "Nginx（反向代理 + SSL + 静态资源）",
  };

  // ===== 当前环境实际信息 =====
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    info.appVersion = pkg.version || "1.0.0";
    info.next = getPkgVersion("next");
    info.react = getPkgVersion("react");
    info.prisma = getPkgVersion("@prisma/client");
  } catch {
    info.next = info.react = info.prisma = "未知";
  }

  info.node = process.version || "未知";
  info.npm = "";
  try {
    const { execSync } = await import("child_process");
    info.npm = execSync("npm -v 2>/dev/null || echo ''", { encoding: "utf8" }).trim();
  } catch {}
  info.platform = `${process.platform} ${os.arch()}`;
  info.env = process.env.NODE_ENV || "development";

  const totalMemGB = os.totalmem() / 1024 / 1024 / 1024;
  const freeMemGB = os.freemem() / 1024 / 1024 / 1024;
  info.memory = `总 ${totalMemGB.toFixed(1)} GB / 可用 ${freeMemGB.toFixed(1)} GB`;
  info.cpuCount = os.cpus().length;
  info.cpuModel = os.cpus()[0]?.model?.trim()?.replace(/\s+/g, " ") || "未知";
  const uptimeDays = os.uptime() / 86400;
  info.uptime = `${uptimeDays >= 1 ? uptimeDays.toFixed(1) + " 天" : (os.uptime() / 3600).toFixed(1) + " 小时"}`;

  // PostgreSQL 版本（从数据库查询）
  info.postgres = "未连接";
  try {
    const rows: any = await prisma.$queryRawUnsafe("SELECT version() AS v");
    info.postgres = rows?.[0]?.v || "未知";
  } catch {
    info.postgres = "数据库连接失败";
  }

  // ===== 达标对比 =====
  const nodeMajor = parseMajor(info.node);
  checks.push({
    label: "Node.js",
    current: info.node,
    recommended: recommended.node,
    status: nodeMajor >= 18 ? "ok" : nodeMajor >= 16 ? "warn" : "error",
  });

  let pgMajor = 0;
  const pgMatch = info.postgres.match(/PostgreSQL (\d+)/);
  if (pgMatch) pgMajor = parseInt(pgMatch[1], 10);
  checks.push({
    label: "PostgreSQL",
    current: pgMatch ? `PostgreSQL ${pgMatch[1]}` : info.postgres,
    recommended: recommended.postgres,
    status: pgMajor >= 14 ? "ok" : pgMajor > 0 ? "warn" : "error",
  });

  checks.push({
    label: "内存",
    current: info.memory,
    recommended: recommended.memory,
    status: totalMemGB >= 4 ? "ok" : totalMemGB >= 2 ? "warn" : "error",
  });

  checks.push({
    label: "CPU",
    current: `${info.cpuCount} 核`,
    recommended: recommended.cpu,
    status: info.cpuCount >= 2 ? "ok" : "warn",
  });

  // 磁盘（尝试读取根分区）
  let diskInfo = "未知";
  let diskOk = true;
  try {
    const { execSync } = await import("child_process");
    if (process.platform === "win32") {
      const out = execSync("wmic logicaldisk get size,freespace /format:list 2>nul || powershell -Command \"(Get-PSDrive C).Used+','+(Get-PSDrive C).Free\"", { encoding: "utf8" });
      diskInfo = "请查看系统磁盘";
    } else {
      const out = execSync("df -h / | tail -1", { encoding: "utf8" });
      const parts = out.trim().split(/\s+/);
      if (parts.length >= 5) {
        diskInfo = `总 ${parts[1]} / 可用 ${parts[3]}`;
        const usePct = parseInt(parts[4], 10);
        diskOk = usePct < 90;
      }
    }
  } catch {}
  checks.push({
    label: "磁盘",
    current: diskInfo,
    recommended: recommended.disk,
    status: diskOk ? "ok" : "warn",
  });

  checks.push({
    label: "操作系统",
    current: `${process.platform} ${os.release()}`,
    recommended: recommended.os,
    status: process.platform === "linux" ? "ok" : "warn",
  });

  checks.push({
    label: "Next.js",
    current: `v${info.next}`,
    recommended: "v14.x（当前项目锁定）",
    status: "info",
  });
  checks.push({
    label: "运行环境",
    current: info.env === "production" ? "生产环境 (production)" : "开发环境 (development)",
    recommended: "生产环境建议使用 production",
    status: info.env === "production" ? "ok" : "info",
  });
  checks.push({
    label: "进程管理",
    current: info.env === "production" ? "PM2" : "开发模式（无 PM2）",
    recommended: recommended.process,
    status: "info",
  });

  return NextResponse.json({
    success: true,
    recommended,
    current: info,
    checks,
    generatedAt: new Date().toISOString(),
  });
}
