// 确认服务器 about_sections contentJa/Ko/Fr/Ar 非空
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
  const q = `SELECT id, slug, jsonb_array_length("contentJa"::jsonb) AS ja, jsonb_array_length("contentKo"::jsonb) AS ko, jsonb_array_length("contentFr"::jsonb) AS fr, jsonb_array_length("contentAr"::jsonb) AS ar FROM about_sections ORDER BY id;`;
  const r = await run(`psql "${u}" -P pager=off -c "${q.replace(/"/g, '\\"')}"`, 30000);
  console.log(r.out);
  conn.end();
})();
