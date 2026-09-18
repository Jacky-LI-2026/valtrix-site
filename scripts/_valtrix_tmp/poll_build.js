// 轮询：等待并发 next build 完成（最多 6 分钟）
const { Client } = require("ssh2");
const conn = new Client();
function run(cmd, timeout = 20000) {
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
  for (let i = 0; i < 12; i++) {
    const a = await run(`ps aux | grep 'next build' | grep -v grep | wc -l; ls /var/www/valtrix/.next/static/chunks/*.js 2>/dev/null | wc -l`, 15000);
    const lines = a.out.trim().split("\n");
    const procs = lines[0] || "?";
    const chunks = lines[1] || "?";
    console.log(`poll${i}: build_proc=${procs} chunks=${chunks}`);
    if (procs === "0" && chunks !== "?" && parseInt(chunks) > 0) break;
    await new Promise((r) => setTimeout(r, 20000));
  }
  const b = await run(`pm2 list | grep valtrix; cat /var/www/valtrix/.next/BUILD_ID 2>/dev/null`, 15000);
  console.log("--- final ---");
  console.log(b.out);
  conn.end();
})();
