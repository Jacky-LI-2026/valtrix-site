// 本地生成一键部署压缩包（tar --exclude，正斜杠 zip）
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const crypto = require("crypto");

const ROOT = process.cwd();
const suffix = crypto.randomBytes(4).toString("hex").slice(0, 8);
const ZIP = path.join(ROOT, "tmp", `zuowen-deploy-20260903-${suffix}.zip`);

const excludes = [
  "node_modules", ".next", ".git", "tmp", "_pgsql", "logs",
  "backups", "_backups", "_local_backup", "config-keys", "项目备份", "data", "public/uploads/_old",
  "docs", "license-keys", ".env", ".env.local", "dev_server.log", "dev_server_err.log",
  "_db_backup.sql", "tsconfig.tsbuildinfo", "_archive", "lib/generated",
];
const patterns = ["*.zip", "*.dump", "*.log"];

const args = ["-a", "-c", "-f", ZIP];
for (const e of excludes) args.push("--exclude", e);
for (const p of patterns) args.push("--exclude", p);
args.push("-C", ROOT, ".");

console.log("打包中（排除 tmp/node_modules/_pgsql 等）...");
if (fs.existsSync(ZIP)) fs.unlinkSync(ZIP);
execFileSync("tar", args, { stdio: "inherit" });
const sizeMB = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
console.log("打包完成:", ZIP, sizeMB + "MB");
console.log("ZIP_PATH=" + ZIP);
