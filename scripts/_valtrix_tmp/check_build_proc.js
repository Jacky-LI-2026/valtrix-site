// 检查是否有并发构建进程 + pm2 状态 + 最近构建产物时间
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
  const a = await run(`ps aux | grep -E 'next build|pnpm build|next-server' | grep -v grep; echo '--- pm2 ---'; pm2 list; echo '--- recent .next files ---'; find /var/www/valtrix/.next -newermt '2 minutes ago' -type f 2>/dev/null | head -5; echo '--- next dirs ---'; ls /var/www/valtrix/ | head -30`, 20000);
  console.log(a.out);
  conn.end();
})();
