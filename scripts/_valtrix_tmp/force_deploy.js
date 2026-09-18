// VALTRIX 强制部署：上传指定改动文件 + pnpm build + pm2 restart
const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");

const HOST = "47.57.241.85";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY_DIR = "/var/www/valtrix";
const ROOT = "D:/阀门网站";

const FILES = [
  "config/i18n.ts",
  "components/layout/Header.tsx",
  "components/layout/Footer.tsx",
  "components/sections/Services.tsx",
  "components/sections/About.tsx",
  "app/contact/page.tsx",
  "components/admin/AdminSidebar.tsx",
  "lib/seo/schema.ts",
  "app/api/public/price/confirm/route.ts",
  "app/admin/ai-video/page.tsx",
  "app/admin/product-categories/page.tsx",
  "lib/industries.ts",
];

const conn = new Client();
const log = (m) => console.log("[" + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "] " + m);
function run(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + "\n[TIMEOUT]" }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
    });
  });
}

(async () => {
  log("连接 " + HOST + " ...");
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect({ host: HOST, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000 }));
  log("已连接");
  try {
    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))));
    // 上传
    for (const f of FILES) {
      const local = path.join(ROOT, f.replace(/\//g, path.sep));
      const remote = DEPLOY_DIR + "/" + f;
      if (!fs.existsSync(local)) { log("本地缺失 " + f); continue; }
      await new Promise((res, rej) => {
        sftp.mkdir(path.posix.dirname(remote), { recursive: true }, () => {
          sftp.fastPut(local, remote, (e) => (e ? rej(e) : res()));
        });
      });
      log("上传 " + f);
    }
    log("上传完成，开始 pnpm build（约 2-4 分钟）...");
    const br = await run(`cd ${DEPLOY_DIR} && pnpm build`, 900000);
    log("build exit=" + br.code);
    const tail = br.out.slice(-400);
    log("build 尾部: " + tail.replace(/\n/g, " | "));
    if (br.code !== 0) throw new Error("build 失败");
    log("重启 pm2 ...");
    const rr = await run(`cd ${DEPLOY_DIR} && pm2 restart valtrix`, 30000);
    log("pm2 restart exit=" + rr.code + " " + rr.out.slice(-200));
    log("健康检查 ...");
    const h = await run("sleep 4; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ ; echo; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/industries ; echo; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/about/profile", 30000);
    log("health: " + h.out);
    log("=== 强制部署完成 ===");
  } catch (e) {
    log("部署失败: " + e.message);
  }
  conn.end();
})();
