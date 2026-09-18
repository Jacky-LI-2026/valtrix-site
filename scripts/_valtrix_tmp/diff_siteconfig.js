// 对比服务器与本地 site-config/route.ts，并检查 force-dynamic
const { Client } = require("ssh2");
const fs = require("fs");
const crypto = require("crypto");
const conn = new Client();
function run(cmd, timeout = 20000) {
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
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect({ host: "47.57.241.85", username: "root", password: '__REMOVED_DEAD_PASSWORD__' }));
  const a = await run(`grep -n 'force-dynamic\\|request.url' /var/www/valtrix/app/api/public/site-config/route.ts; md5sum /var/www/valtrix/app/api/public/site-config/route.ts`, 15000);
  console.log(a.out);
  const local = fs.readFileSync("D:/阀门网站/app/api/public/site-config/route.ts", "utf8");
  console.log("LOCAL has force-dynamic:", local.includes("force-dynamic"));
  console.log("LOCAL md5:", crypto.createHash("md5").update(local).digest("hex"));
  conn.end();
})();
