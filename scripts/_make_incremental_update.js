// 增量更新包生成工具（供应商侧）
// 用法（PowerShell / CMD，均在项目根目录 D:\企业网站 执行）：
//   node scripts/_make_incremental_update.js --version 1.3.0 --prev ../zuowen-1.2.0 [--release-notes "升级说明"] [--out updates/zuowen-update-1.3.0.zip] [--include-migration]
//   node scripts/_make_incremental_update.js --version 1.3.0 --baseline baseline.json [--release-notes "..." --out ...]
//
// 说明：
//   --prev      上一个发布版本的项目根目录（目录快照），与其对比出差异文件
//   --baseline  基线清单 JSON：{ "files": { "./app/x.tsx": "md5", ... } }（可由 --gen-baseline 生成）
//   --gen-baseline  生成当前基线清单到指定文件（用于记录"已发布版本"的文件指纹，作为后续增量基准）
//   --version   本次更新版本号（必填，写入 manifest）
//   --release-notes  本次更新说明
//   --out       输出 zip 路径（默认 updates/zuowen-update-<version>.zip）
//   --include-migration  当 prisma/schema.prisma 有变化时，自动附带 db push 迁移脚本
//
// 产物：zip = manifest.json + 变化的文件。客户在后台「系统更新 → 上传升级包」直接上传即可，
//       或由 update-server.js 托管，客户走「检查更新 / 在线升级」自动拉取。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = process.cwd();

// 与部署/增量部署一致的排除规则（运行期、密钥、客户不可见内容一律不进更新包）
const EXCLUDE_SEGMENTS = ["node_modules", ".next", ".git", "tmp", "_pgsql", "logs", "backups", "_backups", "项目备份", "data", "docs", "scripts", "license-keys", "_old", "public/uploads", "updates"];
const EXCLUDE_FILES = [".env", ".env.local", "dev_server.log", "dev_server_err.log", "_db_backup.sql", "tsconfig.tsbuildinfo"];
const EXCLUDE_PATTERNS = [/\.zip$/, /\.dump$/, /\.log$/, /\.tsbuildinfo$/, /^\.git/i, /\.node$/i];

function md5(buf) { return crypto.createHash("md5").update(buf).digest("hex"); }

// 生成 { "./path": md5 }
function buildManifest(dir) {
  const manifest = {};
  const walk = (cur, rel) => {
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) {
        const segs = r.split(/[\\/]/);
        if (segs.some((x) => EXCLUDE_SEGMENTS.includes(x))) continue;
        walk(p, r);
      } else if (e.isFile()) {
        if (EXCLUDE_FILES.includes(e.name)) continue;
        if (EXCLUDE_PATTERNS.some((re) => re.test(e.name))) continue;
        try { manifest["./" + r.replace(/\\/g, "/")] = md5(fs.readFileSync(p)); } catch {}
      }
    }
  };
  walk(dir, "");
  return manifest;
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      const v = argv[i + 1];
      a[k.slice(2)] = v && !v.startsWith("--") ? v : true;
      if (v && !v.startsWith("--")) i++;
    }
  }
  return a;
}

function zipDir(srcDir, outZip) {
  const absOut = path.resolve(outZip);
  const absSrc = path.resolve(srcDir);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  // 使用 bsdtar（Windows 自带 / Linux 自带）生成正斜杠标准 zip
  execSync(`tar -a -c -f "${absOut}" -C "${absSrc}" .`, { stdio: "inherit", cwd: ROOT });
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const version = args.version;

  // 基线清单生成模式（不需要 --version）
  if (args["gen-baseline"]) {
    const m = buildManifest(ROOT);
    fs.mkdirSync(path.dirname(path.resolve(args["gen-baseline"])), { recursive: true });
    fs.writeFileSync(args["gen-baseline"], JSON.stringify({ version: version || "unknown", files: m }, null, 2), "utf8");
    console.log("基线清单已生成: " + args["gen-baseline"] + "（文件数 " + Object.keys(m).length + "）");
    return;
  }

  if (!version) {
    console.error("缺少 --version 参数");
    process.exit(1);
  }

  // 当前清单
  console.log("扫描当前项目文件...");
  const cur = buildManifest(ROOT);
  console.log("当前文件数: " + Object.keys(cur).length);

  // 基线
  let base = null;
  if (args.baseline) {
    const b = JSON.parse(fs.readFileSync(args.baseline, "utf8"));
    base = b.files || b;
  } else if (args.prev) {
    const prevDir = path.resolve(args.prev);
    if (!fs.existsSync(prevDir)) { console.error("--prev 目录不存在: " + prevDir); process.exit(1); }
    console.log("对比上版本目录: " + prevDir);
    base = buildManifest(prevDir);
  } else {
    console.error("需要 --prev <上版本目录> 或 --baseline <基线清单> 之一");
    process.exit(1);
  }

  // diff：新增/变化
  const changed = Object.keys(cur).filter((f) => base[f] !== cur[f]);
  const deleted = Object.keys(base).filter((f) => !(f in cur));
  console.log("变化/新增文件: " + changed.length + " 个");
  if (deleted.length) console.log("已删除（不处理，仅提示）: " + deleted.length + " 个");

  if (changed.length === 0) {
    console.log("无文件变化，无需生成更新包。");
    return;
  }

  // 组装临时目录
  const tmp = path.join(ROOT, "updates", ".tmp-" + version + "-" + Date.now());
  fs.mkdirSync(tmp, { recursive: true });

  const schemaChanged = changed.some((f) => f.startsWith("./prisma/"));
  let migration = null;
  if (schemaChanged && args["include-migration"]) {
    const migName = `migrations/migrate-${version}.js`;
    const migAbs = path.join(tmp, migName);
    fs.mkdirSync(path.dirname(migAbs), { recursive: true });
    fs.writeFileSync(migAbs, `// 自动生成的数据库迁移（schema 变更）：prisma generate + db push
const { execSync } = require("child_process");
try {
  execSync("npx prisma generate", { cwd: process.cwd(), stdio: "inherit" });
  execSync("npx prisma db push", { cwd: process.cwd(), stdio: "inherit" });
  console.log("[migrate] prisma db push 完成");
} catch (e) {
  console.error("[migrate] 迁移失败: " + e.message);
  process.exit(1);
}
`);
    migration = migName;
    console.log("已生成迁移脚本: " + migName);
  }

  // 复制变化文件到临时目录（保持相对路径）
  for (const f of changed) {
    const rel = f.replace(/^\.\//, "");
    const src = path.join(ROOT, rel.replace(/\//g, path.sep));
    const dst = path.join(tmp, rel.replace(/\//g, path.sep));
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }

  // manifest.json（files 必须含迁移脚本路径，否则客户侧受控覆盖时会跳过该脚本）
  const filesList = [...changed];
  if (migration) filesList.push(migration);

  // 把本次版本号写进 package.json 一并下发，客户应用后本地版本号即同步（避免永远提示有更新）
  try {
    const pkgPath = path.join(ROOT, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.version !== version) {
      pkg.version = version;
      fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
      if (!filesList.includes("./package.json")) filesList.push("./package.json");
      console.log("已写入新版本号 package.json -> " + version);
    }
  } catch (e) {
    console.warn("package.json 版本写入跳过: " + e.message);
  }

  const manifest = {
    version,
    releaseNotes: args["release-notes"] || "",
    files: filesList,
    ...(migration ? { migration } : {}),
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(tmp, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  // 打包
  const outZip = args.out || path.join("updates", `zuowen-update-${version}.zip`);
  console.log("打包增量更新包...");
  zipDir(tmp, outZip);
  console.log("完成：" + path.resolve(outZip) + "（" + (fs.statSync(outZip).size / 1024).toFixed(1) + " KB，" + changed.length + " 个文件）");

  // 清理
  fs.rmSync(tmp, { recursive: true, force: true });
})();
