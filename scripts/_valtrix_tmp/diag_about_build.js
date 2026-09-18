// 查看 .next/server/app/about 构建产物明细
const { Client } = require("ssh2");
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
  const a = await run(`ls -la /var/www/valtrix/.next/server/app/about/; echo '--- [section] build ---'; ls -la '/var/www/valtrix/.next/server/app/about/[section]/' 2>&1; echo '--- routes-manifest about ---'; node -e "const m=require('/var/www/valtrix/.next/routes-manifest.json'); const ks=Object.keys(m.dynamicRoutes||{}).filter(k=>k.includes('about')); console.log(ks.join('\\n'));"`, 20000);
  console.log(a.out);
  conn.end();
})();
