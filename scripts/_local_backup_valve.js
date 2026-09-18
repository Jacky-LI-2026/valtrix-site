// 本地全量备份脚本（排除 node_modules/.next/缓存/日志/临时截图/临时脚本/旧备份）
// 用法：node scripts/_local_backup.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = "D:\\阀门网站";
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const TS = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
// 🔴 2026-09-15 外迁（G8）：备份**必须写在仓库之外**。
//    本脚本**故意**收集 `.env`/`.env.local` 与 RSA 私钥，但此前输出目录在仓库里面
//    ⇒ 仓库长期携带私钥，且交付包生成器会把它整棵打包外发。详见基地仓同源文件的完整说明。
const BACKUP_HOME = process.env.DSH_BACKUP_HOME || "D:\\_site_backups\\valve";
const OUT = path.join(BACKUP_HOME, TS);
fs.mkdirSync(path.join(OUT, "config-keys"), { recursive: true });

const log = (m) => console.log("[" + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "] " + m);

// ---------- 1) 源码打包（排除运行时/缓存/临时/旧备份/私钥/上传图） ----------
const sourceExcludes = [
  "--exclude=node_modules", "--exclude=.next", "--exclude=tmp", "--exclude=_pgsql",
  "--exclude=backups", "--exclude=_backups", "--exclude=项目备份", "--exclude=_local_backup",
  "--exclude=.preview", "--exclude=.tmp_check", "--exclude=updates",
  "--exclude=public/uploads",                 // 上传图单独打包
  "--exclude=scripts/license-keys",           // 私钥进 config-keys
  "--exclude=*.log", "--exclude=*.tsbuildinfo", "--exclude=*.zip",
  "--exclude=dev_server.log", "--exclude=dev_server_err.log", "--exclude=prod_server.log",
  "--exclude=products_ml.log", "--exclude=products_ml_err.log",
  // 根目录临时截图/调试残留
  "--exclude=temp_screenshot.png", "--exclude=_tmp_upload.png",
  "--exclude=_user_a.png", "--exclude=_user_b.png", "--exclude=_user_c.png", "--exclude=_user_d.png",
  "--exclude=\"新建 文本文档.txt\"", "--exclude=full", "--exclude=viewport",
  "--exclude=deploy_inc.txt", "--exclude=followup-plan.md", "--exclude=dev-knowledge-handbook.md",
  "--exclude=左文科技网站及后台_全站备份_*.zip", "--exclude=报价单示例_QT*.pdf",
  // 根目录与 data 下临时脚本/临时 sql/json
  "--exclude=_*.js", "--exclude=_*.sql", "--exclude=_*.json",
  // 注意：**不要**排除 pnpm-workspace.yaml —— 它是 pnpm 10 构建脚本白名单的载体，
  // 属于必须备份的关键配置。（此前该行存在，但写的是 ASCII 连字符，
  // 而实际文件名用的是 U+2011 非断字连字符 `pnpm‑workspace.yaml`，从未匹配上；
  // 该畸形文件名还会让 tar 崩溃 0xC0000005，已于 2026-09-12 删除。）
];
const tar = `cd "${ROOT}" && tar -a -c -f "${OUT}\\source.tar.gz" ${sourceExcludes.join(" ")} -C "${ROOT}" .`;
log("打包源码 source.tar.gz ...");
execSync(tar, { stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
log("source.tar.gz 完成: " + ((fs.statSync(path.join(OUT, "source.tar.gz")).size / 1048576).toFixed(1) + " MB"));

// ---------- 2) 上传图片打包 ----------
log("打包 public/uploads ...");
execSync(`cd "${ROOT}" && tar -a -c -f "${OUT}\\uploads.tar.gz" -C "${ROOT}/public" uploads`, { stdio: "pipe" });
log("uploads.tar.gz 完成: " + ((fs.statSync(path.join(OUT, "uploads.tar.gz")).size / 1048576).toFixed(1) + " MB"));

// ---------- 3) 数据库备份 ----------
log("pg_dump 生产数据库 ...");
const pgDump = "D:\\企业网站\\_pgsql\\extracted\\pgsql\\bin\\pg_dump.exe";
try {
  execSync(`"${pgDump}" --dbname="postgresql://postgres@localhost:5432/zuowen_valve" --column-inserts --no-owner --file="${OUT}\\database.sql"`, { stdio: "pipe" });
  log("database.sql 完成: " + ((fs.statSync(path.join(OUT, "database.sql")).size / 1048576).toFixed(1) + " MB"));
} catch (e) {
  log("⚠️ pg_dump 失败: " + (e.stderr ? e.stderr.toString().slice(0, 300) : e.message));
}

// ---------- 4) 配置与密钥 ----------
log("收集 config-keys ...");
const copyFiles = [".env", ".env.local", "AGENTS.md", "package.json", "pnpm-lock.yaml", "prisma/schema.prisma", "server.js", "auth.ts", "middleware.ts"];
for (const f of copyFiles) {
  if (fs.existsSync(path.join(ROOT, f))) {
    fs.copyFileSync(path.join(ROOT, f), path.join(OUT, "config-keys", path.basename(f)));
  }
}
for (const f of ["config", "docs", "scripts"]) {
  if (fs.existsSync(path.join(ROOT, f))) {
    execSync(`xcopy /E /I /Y /Q "${ROOT}\\${f}" "${OUT}\\config-keys\\${f}" >nul`, { stdio: "pipe" });
  }
}
for (const f of ["data/license.json", "data/license-records.json", "data/download-leads.jsonl"]) {
  if (fs.existsSync(path.join(ROOT, f))) {
    fs.mkdirSync(path.join(OUT, "config-keys", "data"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(OUT, "config-keys", "data", path.basename(f)));
  }
}
// 私钥单独子目录（本地备份保留，严禁外发/部署）
if (fs.existsSync(path.join(ROOT, "scripts", "license-keys"))) {
  execSync(`xcopy /E /I /Y /Q "${ROOT}\\scripts\\license-keys" "${OUT}\\config-keys\\license-keys" >nul`, { stdio: "pipe" });
}

// ---------- 5) MANIFEST ----------
const size = (f) => fs.existsSync(f) ? (fs.statSync(f).size / 1048576).toFixed(2) + " MB" : "缺失";
const manifest = `# 左文科技官网 本地备份清单
备份时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}
备份目录: ${OUT}

## 内容
| 文件 | 大小 | 说明 |
|------|------|------|
| source.tar.gz | ${size(path.join(OUT, "source.tar.gz"))} | 完整源码+配置（排除 node_modules/.next/tmp/_pgsql/backups/_backups/项目备份/.preview/日志/tsbuildinfo/临时截图/临时脚本/旧备份/public/uploads） |
| database.sql | ${size(path.join(OUT, "database.sql"))} | 生产数据库 pg_dump（SQL 格式 --column-inserts） |
| uploads.tar.gz | ${size(path.join(OUT, "uploads.tar.gz"))} | 用户上传图片 public/uploads |
| config-keys/ | - | .env/.env.local/AGENTS.md/package.json/prisma schema/data 业务数据/docs/scripts/私钥 license-keys |

## 还原说明
- 源码: 解压 source.tar.gz 到项目根，pnpm install + prisma db push + pnpm build
- 数据库: psql -f database.sql（本地 PG 17.11）
- 图片: 解压 uploads.tar.gz 到 public/
- 配置: 参考 config-keys/ 恢复 .env/.env.local

## 安全提醒
- config-keys/license-keys/ 内含 RSA 私钥（授权签发用），本备份必须离线/安全保存，严禁上传服务器、云盘或外发。
- .env/.env.local 含数据库/SMTP/翻译 API 密钥，同样注意保密。
`;
fs.writeFileSync(path.join(OUT, "MANIFEST.md"), manifest, "utf8");
log("MANIFEST.md 完成");

log("\n=== 备份完成 ===");
log("备份目录: " + OUT);
