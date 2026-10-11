/**
 * 后台「系统自检」采集器（owner 2026-10-11：把仪表盘上写死的「未检测 / 未接入自动检测」变成真检测）
 * ==========================================================================
 * 背景：这两个徽标此前是**写死的静态文案** —— `app/admin/page.tsx` 里一个 `fetch` 都没有，
 * 所以无论系统好坏都恒显示「未检测」。本模块是它们的**唯一数据源**：
 *   · 服务端渲染时直接调用（首屏就是真实值，不会出现"未检测"闪一下）；
 *   · `GET /api/admin/system-health` 也调它（仪表盘上的客户端组件每 60s 复检 / 点「立即检测」）。
 *
 * 只返回**健康状态**：不含任何密钥，也**不含授权客户编号与绑定域名**（那两项属 license 页权限范围）。
 */
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { readLicense } from "@/lib/license/store";
import { EDITION_LABELS } from "@/lib/license/types";

export interface SystemHealth {
  /** 总体：数据库 + 应用服务都正常才算正常（授权单独用 license.ok 表达 —— 未激活不算"系统坏了"） */
  ok: boolean;
  checkedAt: string;
  database: { ok: boolean; latencyMs: number | null; error?: string };
  app: { ok: boolean; node: string; uptimeSec: number; rssMb: number; pid: number };
  version: { current: string; source: "db" | "package" };
  license: {
    ok: boolean;
    present: boolean;
    edition?: string;
    editionLabel?: string;
    expired?: boolean;
    /** ISO 日期；永久授权为 null */
    expiresAt?: string | null;
    activatedAt?: string;
    error?: string;
  };
}

/** package.json 版本（DB 系统版本表为空时兜底；与侧边栏/部署页同一口径） */
function getPkgVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function collectSystemHealth(): Promise<SystemHealth> {
  // ---- 数据库：真跑一条 SELECT 1，并量往返毫秒 ----
  let database: SystemHealth["database"] = { ok: false, latencyMs: null };
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    database = { ok: false, latencyMs: null, error: String(e?.message || e).slice(0, 160) };
  }

  // ---- 应用服务：本进程存活事实（uptime / 内存 / PID / Node 版本）----
  let app: SystemHealth["app"] = { ok: false, node: process.version, uptimeSec: 0, rssMb: 0, pid: process.pid };
  try {
    const mem = process.memoryUsage();
    app = {
      ok: true,
      node: process.version,
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      pid: process.pid,
    };
  } catch {
    app = { ok: false, node: process.version, uptimeSec: 0, rssMb: 0, pid: process.pid };
  }

  // ---- 版本：DB 里当前系统版本优先，否则 package.json ----
  let version: SystemHealth["version"] = { current: getPkgVersion(), source: "package" };
  try {
    const row = await prisma.systemVersion.findFirst({ where: { isCurrent: true } });
    if (row?.version) version = { current: row.version, source: "db" };
  } catch {
    /* 读不到就保持 package.json 兜底 */
  }

  // ---- 授权：本地 data/license.json（验签在激活时做过；这里只判"有没有 / 过期没"）----
  let license: SystemHealth["license"] = { ok: false, present: false };
  try {
    const rec = readLicense();
    if (!rec || !rec.edition) {
      license = { ok: false, present: false };
    } else {
      const permanent = !rec.exp || rec.exp === 0;
      const expired = !permanent && rec.exp * 1000 < Date.now();
      license = {
        ok: !expired,
        present: true,
        edition: rec.edition,
        editionLabel: EDITION_LABELS[rec.edition] || rec.edition,
        expired,
        expiresAt: permanent ? null : new Date(rec.exp * 1000).toISOString(),
        activatedAt: rec.activatedAt,
      };
    }
  } catch (e: any) {
    license = { ok: false, present: false, error: String(e?.message || e).slice(0, 160) };
  }

  return {
    ok: database.ok && app.ok,
    checkedAt: new Date().toISOString(),
    database,
    app,
    version,
    license,
  };
}
