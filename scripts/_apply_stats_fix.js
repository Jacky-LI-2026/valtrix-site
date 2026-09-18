const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const conn = new Client();
const SQL_FILE = path.join(__dirname, "..", "_qa_audit_20260909", "fix-stats-labels.sql");

conn.on("ready", () => {
  console.log("Connected. Uploading...");
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); process.exit(1); }
    sftp.fastPut(SQL_FILE, "/tmp/fix-stats.sql", (err) => {
      if (err) { console.error("upload err:", err); process.exit(1); }
      console.log("Uploaded. Applying...");
      conn.exec("export PGPASSWORD='__REMOVED_DEAD_PASSWORD__' && psql -h localhost -U postgres -d zuowen_valve -f /tmp/fix-stats.sql 2>&1", (err, stream) => {
        let out = "";
        stream.on("data", (d) => (out += d));
        stream.on("close", (code) => {
          console.log("Exit:", code);
          console.log(out);
          // Verify
          conn.exec("export PGPASSWORD='__REMOVED_DEAD_PASSWORD__' && psql -h localhost -U postgres -d zuowen_valve -c \"SELECT stats->0->'label'->>'ja' as stat1_ja, stats->1->'label'->>'ja' as stat2_ja FROM home_config WHERE id=1;\" 2>&1", (err, stream) => {
            let o2 = "";
            stream.on("data", (d) => (o2 += d));
            stream.on("close", () => { console.log("Verify:", o2); conn.end(); });
          });
        });
      });
    });
  });
}).connect({ host: "47.57.241.85", username: "root", password: '__REMOVED_DEAD_PASSWORD__' });
