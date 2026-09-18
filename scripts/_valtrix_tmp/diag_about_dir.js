// 检查服务器 app/about 目录结构 + .next server 路由
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
  const a = await run(`ls -la /var/www/valtrix/app/about/ 2>&1; echo '--- [section] ---'; ls -la '/var/www/valtrix/app/about/[section]/' 2>&1; echo '--- .next server app about ---'; find /var/www/valtrix/.next/server/app -maxdepth 2 -name 'about*' 2>/dev/null; ls -la /var/www/valtrix/.next/server/app/ 2>/dev/null | head -30`, 20000);
  console.log(a.out);
  conn.end();
})();
