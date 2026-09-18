// 触发请求后立即读最新错误日志 + pm2 进程
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
  const a = await run(`pm2 list | grep valtrix; echo '--- trigger ---'; curl -s -m 20 --cookie 'locale=en' http://127.0.0.1:3000/about/profile -o /dev/null -w '%{http_code}\\n'; sleep 2; echo '--- fresh err tail ---'; tail -40 /root/.pm2/logs/valtrix-error.log 2>/dev/null | tail -40`, 30000);
  console.log(a.out);
  conn.end();
})();
