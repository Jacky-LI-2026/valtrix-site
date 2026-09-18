// 增量部署脚本：只上传有变化的文件（md5 对比），再按需执行服务端步骤
// 用法：node scripts/_deploy_incremental.js
// 说明：node_modules/.next/tmp/_pgsql/data 等运行时/大目录一律不追踪；
//       代码变化才 build+重启；仅静态文件变化则只上传不重启。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("ssh2");

const ROOT = process.cwd();
const HOST = "8.130.65.182";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY_DIR = "/var/www/zuowen";
const PM2_NAME = "zuowen-web";

const EXCLUDE_SEGMENTS = ["node_modules", ".next", ".git", "tmp", "_pgsql", "logs", "backups", "_backups", "_local_backup", "config-keys", "项目备份", "data", "license-keys", "_old", "_archive, _probe_srv_data, _fix_menu_data, _clean_qa_data, _sync_servers_table", "generated"];
const EXCLUDE_PATHS = ["public/uploads/_old"];
const EXCLUDE_FILES = [".env", ".env.local", "dev_server.log", "dev_server_err.log", "_db_backup.sql", "tsconfig.tsbuildinfo", "license-authorization-guide.md", "deploy-guide.md", "nginx-zuowen.conf"];
const EXCLUDE_PATTERNS = [/\.zip$/, /\.dump$/, /\.log$/, /\.tsbuildinfo$/];

const conn = new Client();
const log = (m) => console.log("[" + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "] " + m);

function run(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + "\n[TIMEOUT " + timeout + "ms]" }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
    });
  });
}

function md5(buf) { return crypto.createHash("md5").update(buf).digest("hex"); }

// 本地 manifest：{ "./path": "md5" }
function buildLocalManifest() {
  const manifest = {};
  const walk = (dir, rel) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) {
        const segs = r.split("/");
        if (EXCLUDE_PATHS.includes(r)) continue;
        if (segs.some((s) => EXCLUDE_SEGMENTS.includes(s))) continue;
        walk(p, r);
      } else if (e.isFile()) {
        if (EXCLUDE_FILES.includes(e.name)) continue;
        if (EXCLUDE_PATTERNS.some((re) => re.test(e.name))) continue;
        try { manifest["./" + r.replace(/\\/g, "/")] = md5(fs.readFileSync(p)); } catch {}
      }
    }
  };
  walk(ROOT, "");
  return manifest;
}

const EXCLUDE_FIND = `\\( -name node_modules -o -name .next -o -name .git -o -name tmp -o -name _pgsql -o -name backups -o -name _backups -o -name 项目备份 -o -name data -o -name license-keys -o -name _old -o -path './logs' \\) -prune`;

(async () => {
  log("本地生成文件清单（md5）...");
  const localMan = buildLocalManifest();
  const localFiles = Object.keys(localMan);
  log("本地追踪文件数: " + localFiles.length);

  log("连接 " + HOST + " ...");
  await new Promise((res, rej) => {
    conn.on("ready", res).on("error", rej).connect({
      host: HOST, username: USER, password: PASS,
      keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
    });
  });
  log("已连接");

  try {
    // 服务端 manifest
    log("读取服务器文件清单...");
    const cmdFind = `cd ${DEPLOY_DIR} && find . -type d ${EXCLUDE_FIND} -o -type f \\( -name '*.zip' -o -name '*.dump' -o -name '*.log' -o -name '_db_backup.sql' -o -name 'tsconfig.tsbuildinfo' -o -name '.env' -o -name '.env.local' \\) -prune -o -type f -exec md5sum {} + 2>/dev/null`;
    const r = await run(cmdFind, 60000);
    const serverMan = {};
    for (const line of r.out.split("\n")) {
      const m = line.match(/^([0-9a-f]{32})\s+(\.\/.+)$/);
      if (m) serverMan[m[2]] = m[1];
    }
    log("服务器文件数: " + Object.keys(serverMan).length);

    // diff：changed/new
    const changed = [];
    const onlyServer = [];
    for (const f of localFiles) {
      if (serverMan[f] !== localMan[f]) changed.push(f);
    }
    for (const f of Object.keys(serverMan)) {
      if (!(f in localMan)) onlyServer.push(f);
    }
    log("需上传（新增/变化）: " + changed.length + " 个");
    log("本地已删除（服务器多余，不自动删除）: " + onlyServer.length + " 个（跳过）");

    if (changed.length === 0) {
      log("无文件变化，跳过上传与构建。");
    } else {
      // SFTP 上传
      log("上传 " + changed.length + " 个文件...");
      const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))));
      // 确保远程目录存在（ssh2 sftp.mkdir 不支持 recursive，用 ssh mkdir -p 批量预建）
      const needDirs = [...new Set(changed.map((f) => path.posix.dirname(DEPLOY_DIR + "/" + f.replace(/^\.\//, "").replace(/\//g, "/"))))];
      for (let k = 0; k < needDirs.length; k += 80) {
        const dchunk = needDirs.slice(k, k + 80);
        await run("mkdir -p " + dchunk.map((d) => "'" + d + "'").join(" "), 30000);
      }
      log("已确保 " + needDirs.length + " 个远程目录存在");

      let upBytes = 0;
      const CHUNK = 50;
      for (let i = 0; i < changed.length; i += CHUNK) {
        const slice = changed.slice(i, i + CHUNK);
        await Promise.all(slice.map((f) => new Promise((resolve) => {
          const rel = f.replace(/^\.\//, "");
          const remote = DEPLOY_DIR + "/" + rel.replace(/\//g, "/");
          const dir = path.posix.dirname(remote);
          sftp.mkdir(dir, { recursive: true }, (e) => {
            if (e && e.code !== 4) { /* 目录可能已存在 */ }
            sftp.fastPut(path.join(ROOT, rel), remote, (e2) => {
              if (e2) log("  上传失败 " + rel + ": " + e2.message);
              else { upBytes += fs.statSync(path.join(ROOT, rel)).size; }
              resolve();
            });
          });
        })));
        log("  进度 " + Math.min(i + CHUNK, changed.length) + "/" + changed.length);
      }
      log("上传完成，共 " + (upBytes / 1024 / 1024).toFixed(2) + " MB");

      // 条件执行服务端步骤
      const srcChanged = changed.some((f) => /^(\.\/app\/|\.\/lib\/|\.\/components\/|\.\/config\/|\.\/middleware|\.\/prisma\/|\.\/package\.json|\.\/pnpm-lock|\.\/server\.js|\.\/tsconfig|\.\/tailwind|\.\/next\.config)/.test(f));
      const depsChanged = changed.some((f) => f === "./package.json" || f === "./pnpm-lock.yaml");
      const schemaChanged = changed.some((f) => f.startsWith("./prisma/"));

      if (depsChanged) {
        log("依赖文件变化 → pnpm install ...");
        const ir = await run(`cd ${DEPLOY_DIR} && pnpm install`, 300000);
        log("pnpm install exit=" + ir.code);
      }
      if (schemaChanged) {
        log("schema 变化 → prisma generate + db push ...");
        const pr = await run(`cd ${DEPLOY_DIR} && npx prisma generate && npx prisma db push`, 120000);
        log("prisma exit=" + pr.code + " 尾部: " + pr.out.slice(-200));
      }
      if (srcChanged) {
        log("源码变化 → pnpm build（需几分钟）...");
        const br = await run(`cd ${DEPLOY_DIR} && pnpm build`, 600000);
        log("build exit=" + br.code + " 尾部: " + br.out.slice(-300));
        if (br.code !== 0) throw new Error("build 失败，未重启。服务器可能处于不一致状态，请检查。");
        log("重启 pm2 ...");
        const rr = await run(`cd ${DEPLOY_DIR} && pm2 restart ${PM2_NAME}`, 30000);
        log("pm2 restart exit=" + rr.code);
      } else {
        log("仅静态/其他文件变化，无需 build/重启（Next 直接服务 public/）");
      }
    }

    // 健康检查
    log("健康检查 ...");
    const h = await run("sleep 3; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ ; echo; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/products ; echo; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/admin", 30000);
    log("health: " + h.out);
    const st = await run(`pm2 describe ${PM2_NAME} 2>/dev/null | grep -E 'status|script args'`);
    log("pm2: " + st.out.replace(/\n/g, " | "));
    log("=== 增量部署完成 ===");
  } catch (e) {
    log("部署失败: " + e.message);
  }
  conn.end();
})();
