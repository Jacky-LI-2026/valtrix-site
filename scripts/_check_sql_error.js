const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec("export PGPASSWORD='__REMOVED_DEAD_PASSWORD__' && psql -h localhost -U postgres -d zuowen_valve -f /tmp/data-sync-update-20260909.sql 2>&1 | head -20", (err, stream) => {
    let out = "";
    stream.on("data", (d) => (out += d.toString()));
    stream.on("close", () => { console.log(out); conn.end(); });
  });
}).connect({ host: "47.57.241.85", username: "root", password: '__REMOVED_DEAD_PASSWORD__' });
