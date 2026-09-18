// 对比本地改动文件与服务器 md5
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("ssh2");

const ROOT = "D:/阀门网站";
const DEPLOY_DIR = "/var/www/valtrix";
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
  "scripts/_deploy_incremental_valtrix.js",
  "scripts/_sync_db_valtrix.js",
];
const md5 = (b) => crypto.createHash("md5").update(b).digest("hex");
const conn = new Client();
function run(cmd, timeout = 30000) {
  return new Promise((res, rej) => {
    conn.exec(cmd, { pty: false }, (e, s) => {
      if (e) return rej(e);
      let o = "";
      const t = setTimeout(() => { s.close(); res({ code: -1, out: o }); }, timeout);
      s.on("close", (c) => { clearTimeout(t); res({ code: c, out: o }); });
      s.on("data", (d) => (o += d.toString()));
      s.stderr.on("data", (d) => (o += d.toString()));
    });
  });
}
(async () => {
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect({ host: "47.57.241.85", username: "root", password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 }));
  const targets = FILES.map((f) => DEPLOY_DIR + "/" + f).join(" ");
  const r = await run(`md5sum ${targets} 2>&1`, 30000);
  const srv = {};
  for (const line of r.out.split("\n")) {
    const m = line.match(/^([0-9a-f]{32})\s+(\S+)/);
    if (m) srv[m[2].replace(DEPLOY_DIR + "/", "")] = m[1];
  }
  for (const f of FILES) {
    let lm = null;
    try { lm = md5(fs.readFileSync(path.join(ROOT, f))); } catch {}
    const sm = srv[f];
    const mark = lm === sm ? "SAME" : "DIFF" + (sm ? "" : "(server missing)");
    console.log(f + " -> " + mark);
  }
  conn.end();
})();
