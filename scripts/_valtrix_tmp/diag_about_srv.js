// 诊断服务器 about_sections 结构 + menu 结构 + 导入结果
const { Client } = require("ssh2");
const conn = new Client();
function run(cmd, timeout = 60000) {
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
  const env = await run('grep -E "^DATABASE_URL=" /var/www/valtrix/.env | head -1', 20000);
  const u = env.out.replace(/^DATABASE_URL=\s*"?|"?\s*$/g, "").replace(/\?schema=[^&]*/, "");
  console.log("--- about_sections columns ---");
  console.log((await run(`psql "${u}" -P pager=off -c "SELECT column_name FROM information_schema.columns WHERE table_name='about_sections' ORDER BY ordinal_position;"`, 30000)).out);
  console.log("--- about_sections rows ---");
  console.log((await run(`psql "${u}" -P pager=off -c "SELECT id, slug, title, left(content::text,80) AS c FROM about_sections ORDER BY id;"`, 30000)).out);
  console.log("--- menu columns ---");
  console.log((await run(`psql "${u}" -P pager=off -c "SELECT column_name FROM information_schema.columns WHERE table_name='menu' ORDER BY ordinal_position;"`, 30000)).out);
  console.log("--- menu sample ---");
  console.log((await run(`psql "${u}" -P pager=off -c "SELECT id, name, COALESCE(\\"nameJa\\",'') AS ja, url FROM menu ORDER BY id LIMIT 8;"`, 30000)).out);
  conn.end();
})();
