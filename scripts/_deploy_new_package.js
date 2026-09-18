// 部署新包到服务器 8.130.65.182（ssh2 exec 方式，keepalive）
const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");

const ZIP = path.join(process.cwd(), "tmp", "zuowen-deploy-20260903-625d18fc.zip");
const HOST = "8.130.65.182";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY_DIR = "/var/www/zuowen";
const PM2_NAME = "zuowen-web";

const conn = new Client();
const log = (m) => console.log("[" + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "] " + m);

function run(cmd, timeout = 60000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + "\n[TIMEOUT " + timeout + "ms]" }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => { out += d.toString(); });
      stream.stderr.on("data", (d) => { out += d.toString(); });
    });
  });
}

(async () => {
  log("连接 " + HOST + " ...");
  await new Promise((res, rej) => {
    conn.on("ready", res).on("error", rej).connect({
      host: HOST, username: USER, password: PASS,
      keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
    });
  });
  log("已连接");

  try {
    // 0. 检查服务器是否已有上传的 zip（避免重复上传 132MB）
    let r = await run(`ls -la /tmp/deploy-package.zip 2>/dev/null && md5sum /tmp/deploy-package.zip`, 15000);
    const localMd5 = require("crypto").createHash("md5").update(fs.readFileSync(ZIP)).digest("hex");
    let needUpload = true;
    if (r.code === 0) {
      const srvMd5 = (r.out.match(/[0-9a-f]{32}/) || [""])[0];
      if (srvMd5 === localMd5) { needUpload = false; log("服务器已有相同 zip，跳过上传"); }
    }
    if (needUpload) {
      log("上传部署包 (" + (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1) + "MB)...");
      await new Promise((res, rej) => {
        conn.sftp((err, sftp) => {
          if (err) return rej(err);
          sftp.fastPut(ZIP, "/tmp/deploy-package.zip", (e) => e ? rej(e) : res());
        });
      });
      log("上传完成");
    }

    // 1. 解压
    log("解压代码到 " + DEPLOY_DIR);
    r = await run(`set -e
rm -rf /tmp/deploy-extract
mkdir -p /tmp/deploy-extract
if command -v unzip >/dev/null 2>&1; then unzip -o /tmp/deploy-package.zip -d /tmp/deploy-extract >/dev/null; else python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" /tmp/deploy-package.zip /tmp/deploy-extract; fi
SRC=""
FOUND=$(find /tmp/deploy-extract -name package.json 2>/dev/null | head -1)
[ -n "$FOUND" ] && SRC=$(dirname "$FOUND")
[ -n "$SRC" ] || SRC=/tmp/deploy-extract
mkdir -p "${DEPLOY_DIR}"
cp -rf "$SRC"/. "${DEPLOY_DIR}"/
if command -v python3 >/dev/null 2>&1; then python3 - <<'PYEOF'
import os, shutil
root = "${DEPLOY_DIR}"
for r, _, fs in os.walk(root):
    for f in fs:
        if "\\\\" in f:
            o = os.path.join(r, f); n = os.path.join(r, f.replace("\\\\", "/"))
            os.makedirs(os.path.dirname(n), exist_ok=True); shutil.move(o, n)
PYEOF
fi
rm -rf /tmp/deploy-extract /tmp/deploy-package.zip
echo EXTRACT_DONE`, 180000);
    log("解压 exit=" + r.code + (r.code !== 0 ? " " + r.out.slice(-300) : " OK"));

    // 2. 安装依赖
    log("pnpm install（含 sharp 原生编译）...");
    r = await run(`cd "${DEPLOY_DIR}" && pnpm install 2>&1 | tail -6`, 600000);
    log("依赖安装 exit=" + r.code + " 尾部: " + r.out.slice(-400));

    // 3. prisma generate + db push
    log("prisma generate + db push ...");
    r = await run(`cd "${DEPLOY_DIR}" && npx prisma generate 2>&1 | tail -3 && npx prisma db push 2>&1 | tail -3`, 300000);
    log("db 同步 exit=" + r.code + " " + r.out.slice(-300));

    // 4. 构建
    log("pnpm build（需几分钟）...");
    r = await run(`cd "${DEPLOY_DIR}" && pnpm build 2>&1 | tail -20`, 900000);
    log("build exit=" + r.code + " 尾部: " + r.out.slice(-800));

    // 5. pm2 重启
    log("重启 pm2 ...");
    r = await run(`command -v pm2 || npm install -g pm2 2>&1 | tail -1; cd "${DEPLOY_DIR}"; if pm2 describe ${PM2_NAME} >/dev/null 2>&1; then if pm2 describe ${PM2_NAME} 2>/dev/null | grep -q "next start"; then pm2 delete ${PM2_NAME} && NODE_ENV=production pm2 start "node server.js" --name ${PM2_NAME}; else pm2 restart ${PM2_NAME}; fi; else NODE_ENV=production pm2 start "node server.js" --name ${PM2_NAME}; fi 2>&1 | tail -5; pm2 save 2>&1 | tail -1`, 60000);
    log("pm2 exit=" + r.code);

    // 6. 健康检查
    log("健康检查 ...");
    r = await run(`sleep 3; curl -s -o /dev/null -w "home=%{http_code} " http://127.0.0.1:3000/; curl -s -o /dev/null -w "product=%{http_code} " http://127.0.0.1:3000/products/growth/zw-10d; curl -s -o /dev/null -w "admin=%{http_code}\\n" http://127.0.0.1:3000/admin; pm2 list | grep ${PM2_NAME}`, 30000);
    log("健康检查: " + r.out.trim());

    log("=== 部署流程完成 ===");
  } catch (e) {
    console.error("部署出错:", e.message);
  } finally {
    conn.end();
    process.exit(0);
  }
})().catch((e) => { console.error("连接失败:", e.message); process.exit(1); });
