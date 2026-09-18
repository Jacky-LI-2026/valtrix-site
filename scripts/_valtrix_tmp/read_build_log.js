// 读取服务器 build 日志关键段
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
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect({ host: "47.57.241.85", username: "root", password: '__REMOVED_DEAD_PASSWORD__' }));
  const a = await run(`echo '--- grep errors ---'; grep -n -E 'Error|error|Failed|ELIFECYCLE|DYNAMIC|Compiled successfully' /tmp/valtrix_build.log | head -40; echo '--- tail ---'; tail -25 /tmp/valtrix_build.log; echo '--- wc ---'; wc -l /tmp/valtrix_build.log`, 20000);
  console.log(a.out);
  conn.end();
})();
