#!/usr/bin/env node
/**
 * 阀门站（VALTRIX）**离线全量备份** —— 落到仓库之外，自包含、可离线还原
 * ==========================================================================
 * 背景（owner 2026-10-09）：阀门服务器到期、主机不可达 ⇒ 需要一份不依赖服务器的本地还原点。
 *
 * 打包内容（各取所需，互不重复）：
 *   ① code/valtrix-site.bundle   —— `git bundle --all`：全部提交 + 所有被跟踪文件（含 public/downloads）
 *   ② runtime/uploads/           —— `public/uploads`（**被 gitignore 的运行时上传图**，git 包里没有 ⇒ 必须单拎）
 *   ③ runtime/data/              —— `data/`（运行时数据：下载线索、抓取原始资料等，同样被 ignore）
 *   ④ db/valtrix-db.backup       —— 本机 PostgreSQL 里 `zuowen_valve` 的 `pg_dump -Fc`（**旧快照**，见 MANIFEST）
 *   ⑤ secrets/                   —— `.env` / `.env.local`（**含密钥**，单独放并显式标注）
 *   ⑥ MANIFEST.md + checksums.txt —— 清单、还原步骤、每个文件的 sha256
 *
 * 刻意**不打包**：`node_modules`、`.next`（重新安装/构建即可）。
 *
 * 用法：node scripts/_valve_offline_backup.js [--out D:\somewhere]
 *      默认输出 `D:\_site_backups\valve\<YYYYMMDD-HHmmss>\`（可用环境变量 DSH_BACKUP_HOME 覆盖根）
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const REPO = "D:\\阀门网站";
const BASE = "D:\\企业网站";
const PG_BIN = path.join(BASE, "_pgsql", "extracted", "pgsql", "bin");
const DB_NAME = "zuowen_valve";
const argv = process.argv.slice(2);
const outArg = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "";
/** 时间戳按**本机时区**（北京时间）生成，避免 ISO(UTC) 让目录名差 8 小时 */
const now = new Date();
const p2 = (n) => String(n).padStart(2, "0");
const STAMP = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
const BACKUP_HOME = process.env.DSH_BACKUP_HOME || "D:\\_site_backups\\valve";
const OUT = outArg || path.join(BACKUP_HOME, STAMP);

const log = (m) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${m}`);
const mb = (p) => {
  const walk = (d) => (fs.statSync(d).isFile() ? fs.statSync(d).size : fs.readdirSync(d).reduce((n, f) => n + walk(path.join(d, f)), 0));
  try {
    return (walk(p) / 1024 / 1024).toFixed(1) + " MB";
  } catch {
    return "—";
  }
};

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

(async () => {
  if (!fs.existsSync(REPO)) {
    console.error("⛔ 找不到阀门仓：" + REPO);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  log(`输出目录：${OUT}`);

  // ① git bundle（全历史 + 所有被跟踪文件）
  const bundle = path.join(OUT, "code", "valtrix-site.bundle");
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  log("① git bundle --all（全历史）…");
  execFileSync("git", ["-C", REPO, "bundle", "create", bundle, "--all"], { stdio: "inherit" });
  log(`   ${mb(bundle)}`);

  // ② 运行时上传图（gitignore ⇒ bundle 里没有）
  log("② public/uploads（运行时上传图）…");
  copyDir(path.join(REPO, "public", "uploads"), path.join(OUT, "runtime", "uploads"));
  log(`   ${mb(path.join(OUT, "runtime", "uploads"))}`);

  // ③ 运行时数据
  log("③ data/（下载线索/抓取资料等运行时数据）…");
  copyDir(path.join(REPO, "data"), path.join(OUT, "runtime", "data"));
  log(`   ${mb(path.join(OUT, "runtime", "data"))}`);

  // ④ 数据库（本机 PG 里的旧快照；-Fc 自定义格式，用 pg_restore 还原）
  const dump = path.join(OUT, "db", "valtrix-db.backup");
  fs.mkdirSync(path.dirname(dump), { recursive: true });
  log(`④ pg_dump -Fc ${DB_NAME} …`);
  const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || "postgres" };
  const out = execFileSync(
    path.join(PG_BIN, "pg_dump.exe"),
    ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", "-d", DB_NAME, "-Fc", "-f", dump],
    { env, encoding: "utf8" }
  );
  if (out && out.trim()) log("   " + out.trim());
  log(`   ${mb(dump)}`);

  // ⑤ 密钥（单独目录 + 显式标注）
  const sec = path.join(OUT, "secrets");
  fs.mkdirSync(sec, { recursive: true });
  for (const f of [".env", ".env.local"]) {
    const p = path.join(REPO, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(sec, f));
  }
  fs.writeFileSync(
    path.join(sec, "README-含密钥勿外发.txt"),
    "⚠️ 本目录含数据库连接串、NextAuth 密钥与第三方 API Key。\n禁止上传云盘/仓库/外发。仅供本机还原使用。\n",
    "utf8"
  );
  log("⑤ secrets/（.env / .env.local）…");

  // ⑥ MANIFEST + 校验和
  const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const commits = execFileSync("git", ["-C", REPO, "rev-list", "--count", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }).trim();
  const manifest = [
    `# 阀门站（VALTRIX）离线全量备份 · ${STAMP}`,
    "",
    "## 一、这份包里有什么",
    "",
    "| 路径 | 内容 | 说明 |",
    "| :-- | :-- | :-- |",
    `| \`code/valtrix-site.bundle\` | **全部 git 历史 + 所有被跟踪文件** | HEAD \`${head}\`（${commits} 个提交）；含 \`public/downloads\`、\`industry-packs/\`、\`prisma/\` 等 |`,
    "| `runtime/uploads/` | `public/uploads` 运行时上传图 | ⚠️ 被 gitignore ⇒ **git 包里没有**，只在这里 |",
    "| `runtime/data/` | `data/` 运行时数据 | 下载线索（`download-leads.jsonl`）、抓取原始资料等，同样不在 git 里 |",
    `| \`db/valtrix-db.backup\` | 本机 PostgreSQL \`${DB_NAME}\` 的 \`pg_dump -Fc\` | ⚠️ **旧快照（约 2026-10-07），且 \`product_specs\` 为空**，不等于线上最新库 |`,
    "| `secrets/` | `.env` / `.env.local` | ⚠️ **含密钥，勿外发** |",
    "",
    "刻意**未打包**：`node_modules`、`.next`（重新安装/构建即可）。",
    "",
    "## 二、还原步骤（PowerShell）",
    "",
    "```powershell",
    "# 1) 代码（含全部历史）",
    "git clone <本包>\\code\\valtrix-site.bundle D:\\阀门网站_还原",
    "git bundle verify <本包>\\code\\valtrix-site.bundle",
    "",
    "# 2) 运行时文件（git 里没有的那些）",
    "Copy-Item -Recurse <本包>\\runtime\\uploads .\\public\\   # 在还原出来的仓里执行",
    "Copy-Item -Recurse <本包>\\runtime\\data    .\\",
    "",
    "# 3) 环境变量",
    "Copy-Item <本包>\\secrets\\.env* .\\",
    "",
    "# 4) 数据库（需要 PostgreSQL；本机可用 _pgsql\\extracted\\pgsql\\bin）",
    "createdb -h 127.0.0.1 -U postgres valtrix",
    "pg_restore -h 127.0.0.1 -U postgres -d valtrix --no-owner --no-privileges <本包>\\db\\valtrix-db.backup",
    "",
    "# 5) 依赖与构建",
    "pnpm install; pnpm build:clean-home",
    "```",
    "",
    "## 三、这份备份**不能**替代什么（重要）",
    "",
    "- **线上最新数据库**：本包里的库是旧快照，后台上传/录入的正文、询价车、表单、下载线索、会员等**运行数据不在其中**。",
    "  ⇒ 若阿里云实例仍在保留期内，**请先续费并做数据盘快照**，或让我在能连上时导一次最新库。",
    "- 服务器侧环境：PM2 配置、nginx 配置、HTTPS 证书 —— 本机没有。",
    "- 产品规格（`product_specs`）：本机库里为空；可用手册重生成（`scripts/_extract_manual_specs.js`、`scripts/_extract_conn_codes.js`，手册原件在 `D:\\业务类\\…\\产品手册\\html版`）。",
    "",
    "## 四、打包时的仓库状态",
    "",
    `- HEAD：\`${head}\`（${commits} 个提交）`,
    dirty ? "- 工作区：⚠️ 有未提交改动（见下）\n\n```\n" + dirty + "\n```" : "- 工作区：干净 ✅",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "MANIFEST.md"), manifest, "utf8");

  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && path.basename(p) !== "checksums.txt") files.push(p);
    }
  };
  walk(OUT);
  const lines = files
    .sort()
    .map((p) => `${crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")}  ${path.relative(OUT, p).replace(/\\/g, "/")}`);
  fs.writeFileSync(path.join(OUT, "checksums.txt"), lines.join("\n") + "\n", "utf8");

  log("⑥ MANIFEST.md + checksums.txt 已写入");
  log(`包大小：${mb(OUT)}；文件数：${files.length + 1}`);
  console.log("\n完成 ✅  " + OUT);
})().catch((e) => {
  console.error("失败：" + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
