// 检查服务器 .next 目录结构与磁盘
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
  const a = await run(`cd /var/www/valtrix && ls -la .next/ 2>&1 | head -20; echo '--- static ---'; ls -la .next/static/ 2>&1 | head -10; echo '--- chunks count ---'; find .next/static -name '*.js' 2>/dev/null | wc -l; echo '--- BUILD_ID ---'; cat .next/BUILD_ID 2>&1; echo; echo '--- disk ---'; df -h /var/www | tail -1; echo '--- du .next ---'; du -sh .next 2>/dev/null; echo '--- pm2 cwd ---'; pm2 describe valtrix 2>/dev/null | grep -E 'script path|exec cwd|uptime|restarts'`, 40000);
  console.log(a.out);
  conn.end();
})();
