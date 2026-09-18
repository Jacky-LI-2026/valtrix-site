// 上传数据同步 SQL 到服务器并执行
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const HOST = "47.57.241.85";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const SQL_FILE = path.join(__dirname, "..", "_qa_audit_20260909", "data-sync-update-20260909.sql");
const REMOTE_SQL = "/tmp/data-sync-update-20260909.sql";

const conn = new Client();

function run(cmd, timeout = 60000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + "\n[TIMEOUT]" }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
    });
  });
}

function upload(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

async function main() {
  console.log("Connecting to server...");
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect({ host: HOST, username: USER, password: PASS });
  });
  console.log("Connected.");

  // Upload SQL
  console.log("Uploading SQL...");
  await upload(SQL_FILE, REMOTE_SQL);
  console.log("Uploaded.");

  // Find psql and DB credentials
  console.log("Checking server DB...");
  const envCheck = await run("cat /var/www/valtrix/.env 2>/dev/null | grep -i database_url; which psql; ls /usr/lib/postgresql/*/bin/psql 2>/dev/null", 10000);
  console.log("Env check:", envCheck.out.replace(/\n/g, " | ").slice(0, 300));

  // Apply SQL - try common psql paths
  const sqlContent = fs.readFileSync(SQL_FILE, "utf8");
  const lines = sqlContent.split("\n").length;
  console.log(`SQL has ${lines} lines`);

  // Apply using psql with DATABASE_URL from .env
  const apply = await run(`cd /var/www/valtrix && export PGPASSWORD='__REMOVED_DEAD_PASSWORD__' && psql -h localhost -U postgres -d zuowen_valve -f ${REMOTE_SQL} 2>&1`, 120000);
  console.log("Apply exit code:", apply.code);
  console.log("Apply output (last 20 lines):");
  console.log(apply.out.split("\n").slice(-20).join("\n"));

  if (apply.code !== 0) {
    // Try with different DB name or credentials
    console.log("\nTrying alternative psql path...");
    const alt = await run(`find /usr/lib/postgresql -name psql -type f 2>/dev/null | head -1`, 10000);
    console.log("psql path:", alt.out.trim());
  }

  // Quick verify: count jobs with titleJa not null
  console.log("\nVerifying...");
  const verify = await run(`export PGPASSWORD='__REMOVED_DEAD_PASSWORD__' && psql -h localhost -U postgres -d zuowen_valve -c 'SELECT count(*) as jobs_with_ja FROM jobs WHERE "titleJa" IS NOT NULL AND "titleJa" <> \\'\\'; SELECT count(*) as svc_with_ja FROM services WHERE "processJa" IS NOT NULL;' 2>&1`, 15000);
  console.log("Verify:", verify.out);

  conn.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
