// 服务器完整 build 日志抓取（写到服务器文件再读关键段）
const { Client } = require("ssh2");
const conn = new Client();
function run(cmd, timeout = 600000) {
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
  const a = await run(`cd /var/www/valtrix && pnpm build > /tmp/valtrix_build.log 2>&1; echo EXIT=$?`, 600000);
  console.log("build done:", a.out.trim());
  const b = await run(`grep -n -E 'Error|error|Failed|ELIFECYCLE|DYNAMIC' /tmp/valtrix_build.log | head -30`, 15000);
  console.log(b.out);
  conn.end();
})();
