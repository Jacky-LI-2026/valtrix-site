// 查看 /about/profile 500 的服务器错误日志
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
  // 先触发一次请求，再抓日志
  const a = await run(`curl -s -m 20 --cookie 'locale=ja' http://127.0.0.1:3000/about/profile -o /dev/null -w '%{http_code}\\n'; sleep 1; tail -60 /root/.pm2/logs/valtrix-error.log 2>/dev/null`, 30000);
  console.log(a.out);
  conn.end();
})();
