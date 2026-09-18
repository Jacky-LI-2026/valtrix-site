// 服务器检查：chunk 8850 是否存在、HTML 引用、pm2 日志尾部
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
  const a = await run(`cd /var/www/valtrix && ls -la .next/static/chunks/ | grep -c js; ls -la .next/static/chunks/8850* 2>/dev/null || echo CHUNK8850_MISSING; echo '--- html refs ---'; curl -s -m 20 --cookie 'locale=ja' http://127.0.0.1:3000/industries/semiconductor | grep -o '8850[^\"]*' | head -3; curl -s -m 20 --cookie 'locale=ja' http://127.0.0.1:3000/industries/semiconductor -o /tmp/ind.html -w 'SSR_STATUS:%{http_code}\\n'; grep -o 'chunks/[a-z0-9-]*\\.js' /tmp/ind.html | sort -u | head -20`, 40000);
  console.log(a.out);
  const b = await run(`tail -30 /root/.pm2/logs/valtrix-error.log 2>/dev/null || tail -30 /root/.pm2/logs/valtrix-out.log 2>/dev/null`, 15000);
  console.log("--- pm2 log ---");
  console.log(b.out);
  conn.end();
})();
