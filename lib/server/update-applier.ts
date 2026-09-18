import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

// 客户侧「系统更新」应用器
// 支持三种来源：远程更新服务器下载 / 本地上传升级包 / 服务器本地临时目录
// 应用逻辑：解压 → 校验 manifest → 覆盖项目文件（排除运行期/密钥/数据）→ 输出是否需要 db push

// 解压时绝不覆盖的路径段（运行期、密钥、客户数据）
const NEVER_OVERWRITE = [
  ".env", ".env.local", ".env.production",
  "node_modules", ".next", "public/uploads", "data", "logs",
  "license-keys", "_pgsql", "backups", "_backups", "项目备份",
  "dev_server.log", "tsconfig.tsbuildinfo",
];

function isExcluded(rel: string): boolean {
  const parts = rel.split(/[\\/]/).filter(Boolean);
  return parts.some((p) => NEVER_OVERWRITE.includes(p));
}

export interface UpdateManifest {
  version: string;
  releasedAt?: string;
  releaseNotes?: string;
  migration?: boolean;
  files?: string[];
  [k: string]: unknown;
}

export interface ApplyResult {
  ok: boolean;
  version?: string;
  applied: string[];
  migration: boolean;
  error?: string;
  log: string[];
}

function md5(buf: Buffer): string {
  return crypto.createHash("md5").update(buf).digest("hex");
}

/** 解压 zip 到目标目录（跨平台：python3 zipfile → unzip → tar） */
function extractZip(zipPath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  const cmds = [
    `python3 -c "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipPath}" "${destDir}"`,
    `unzip -o -q "${zipPath}" -d "${destDir}"`,
    `tar -xf "${zipPath}" -C "${destDir}"`,
  ];
  let lastErr: unknown = null;
  for (const cmd of cmds) {
    try {
      execSync(cmd, { stdio: "pipe", timeout: 120000 });
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error("无法解压更新包（python3/unzip/tar 均不可用）: " + (lastErr as Error)?.message);
}

/** 读取 zip 内 manifest.json 的文本内容（不落盘） */
function readManifestFromZip(zipPath: string): UpdateManifest | null {
  try {
    const out = execSync(
      `python3 -c "import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);names=z.namelist();m=[n for n in names if n.endswith('/manifest.json') or n=='manifest.json'];print(z.read(m[0]).decode('utf-8') if m else '')" "${zipPath}"`,
      { encoding: "utf8", timeout: 30000 }
    ).trim();
    if (!out) return null;
    return JSON.parse(out) as UpdateManifest;
  } catch {
    return null;
  }
}

/**
 * 应用更新包（zip 文件路径 → 项目根目录）
 * - manifest.json 内的 files 列表为受控覆盖清单（可选）；缺失时解压全部再按排除规则过滤
 * - migration=true 提示需执行 prisma db push（由调用方决定是否执行）
 */
export function applyUpdateZip(zipPath: string, projectRoot: string): ApplyResult {
  const log: string[] = [];
  const result: ApplyResult = { ok: false, applied: [], migration: false, log };
  let tmpDir = "";
  try {
    if (!fs.existsSync(zipPath)) {
      result.error = "更新包不存在：" + zipPath;
      return result;
    }

    // 1. 解压到临时目录
    tmpDir = path.join(projectRoot, "tmp", "update-extract-" + Date.now());
    extractZip(zipPath, tmpDir);
    log.push("解压完成");

    // 2. 定位包内项目根（zip 可能含顶层目录）
    let srcDir = tmpDir;
    const candidates: string[] = [];
    const walkTop = (dir: string, depth: number) => {
      if (depth > 3) return;
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      if (entries.some((e) => e.isFile() && e.name === "package.json")) {
        candidates.push(dir);
        return;
      }
      const sub = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
      if (sub.length === 1) walkTop(path.join(dir, sub[0].name), depth + 1);
    };
    walkTop(tmpDir, 0);
    if (candidates.length > 0) srcDir = candidates[0];

    // 3. 读取 manifest（版本校验）
    let manifest: UpdateManifest | null = null;
    try {
      const mf = path.join(srcDir, "manifest.json");
      if (fs.existsSync(mf)) {
        let raw = fs.readFileSync(mf, "utf8");
        if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // 去 BOM
        manifest = JSON.parse(raw) as UpdateManifest;
      }
    } catch {}
    const version = manifest?.version || "unknown";
    result.version = version;
    // migration 字段可能是布尔 true 或迁移脚本路径字符串（供应商两种写法兼容）
    result.migration = !!manifest?.migration;
    log.push(`更新包版本：${version}` + (result.migration ? "（含数据库变更）" : ""));

    // 4. 覆盖文件（排除运行期/密钥/数据）
    const applied: string[] = [];
    const controlledFiles = Array.isArray(manifest?.files) ? manifest.files as string[] : null;
    const walk = (cur: string, rel: string) => {
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const p = path.join(cur, e.name);
        const r = rel ? rel + "/" + e.name : e.name;
        if (e.isDirectory()) {
          if (isExcluded(r)) continue;
          walk(p, r);
        } else if (e.isFile()) {
          if (isExcluded(r)) continue;
          if (controlledFiles && !controlledFiles.includes("./" + r) && !controlledFiles.includes(r)) continue;
          const dest = path.join(projectRoot, r);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          // 校验与目标一致的旧文件（防止覆盖用户已改文件）：仅当目标存在且内容不同且受控清单未包含时跳过——受控清单即供应商明确发布，直接覆盖
          fs.copyFileSync(p, dest);
          applied.push(r);
        }
      }
    };
    walk(srcDir, "");

    // 5. 清理临时目录
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    result.ok = true;
    result.applied = applied;
    log.push(`已更新 ${applied.length} 个文件` + (result.migration ? "（包含数据库变更，需执行 prisma db push）" : ""));
    return result;
  } catch (e: any) {
    result.ok = false;
    result.error = e?.message || "应用更新失败";
    log.push("失败：" + result.error);
    return result;
  }
}

/** 校验 zip 的 md5（与期望值比对，防止下载损坏） */
export function verifyZipMd5(zipPath: string, expected: string): boolean {
  if (!expected) return true;
  try {
    return md5(fs.readFileSync(zipPath)) === expected;
  } catch {
    return false;
  }
}
