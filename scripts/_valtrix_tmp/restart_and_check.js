// 重启 pm2 valtrix 并做健康检查
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
  const a = await run(`pm2 restart valtrix && sleep 3 && pm2 list | grep valtrix`, 30000);
  console.log(a.out);
  const b = await run(`curl -s -m 20 http://127.0.0.1:3000/ -o /tmp/h.html -w 'home:%{http_code}\\n'; curl -s -m 20 --cookie 'locale=ja' http://127.0.0.1:3000/industries/semiconductor -o /tmp/i.html -w 'ind:%{http_code}\\n'`, 30000);
  console.log(b.out);
  const c = await run(`grep -c 'MPCVD\\|左文\\|金刚石' /tmp/h.html; grep -o 'Ultra-High Purity[^<]*' /tmp/h.html | head -1`, 15000);
  console.log("markers:", c.out);
  conn.end();
})();
