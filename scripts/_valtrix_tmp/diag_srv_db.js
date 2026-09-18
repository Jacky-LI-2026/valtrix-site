// 诊断服务器 DB 表结构
const { Client } = require("ssh2");
const HOST = "47.57.241.85", USER = "root", PASS = '__REMOVED_DEAD_PASSWORD__', DEPLOY_DIR = "/var/www/valtrix";
const conn = new Client();
function run(cmd, timeout = 60000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
    });
  });
}
(async () => {
  await new Promise((res, rej) => conn.on("ready", res).on("error", rej).connect({ host: HOST, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }));
  const envR = await run(`grep -E '^DATABASE_URL=' ${DEPLOY_DIR}/.env | head -1`, 20000);
  const rawUrl = envR.out.replace(/^DATABASE_URL=\s*"?|"?\s*$/g, "");
  console.log("URL:", rawUrl);
  const dbUrl = rawUrl.replace(/\?schema=[^&]*/, "");
  const r1 = await run(`psql "${dbUrl}" -P pager=off -c "SHOW search_path;"`, 30000);
  console.log("search_path:", r1.out);
  const r2 = await run(`psql "${dbUrl}" -P pager=off -c "SELECT schemaname, tablename FROM pg_tables WHERE tablename IN ('menu','about_sections','resource_categories','industries') ORDER BY 1,2;"`, 30000);
  console.log("tables:", r2.out);
  const r3 = await run(`psql "${dbUrl}" -P pager=off -c "SELECT table_schema || '.' || table_name FROM information_schema.tables WHERE table_name ILIKE '%menu%' OR table_name ILIKE '%about%' OR table_name ILIKE '%resource_categor%' OR table_name ILIKE '%industr%' ORDER BY 1;"`, 30000);
  console.log("like:", r3.out);
  conn.end();
})();
