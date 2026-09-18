// VALTRIX DB 同步到服务器 47.57.241.85：menu/about_sections TRUNCATE+导入，resource_categories/industries UPDATE
// 用法：node scripts/_sync_db_valtrix.js
const fs = require("fs");
const { Client } = require("ssh2");

const HOST = "47.57.241.85";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY_DIR = "/var/www/valtrix";

const conn = new Client();
const log = (m) => console.log("[" + new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "] " + m);

function run(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + "\n[TIMEOUT " + timeout + "ms]" }); }, timeout);
      stream.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
    });
  });
}

(async () => {
  log("连接 " + HOST + " ...");
  await new Promise((res, rej) => {
    conn.on("ready", res).on("error", rej).connect({
      host: HOST, username: USER, password: PASS,
      keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
    });
  });
  log("已连接");

  try {
    // 1. 读取服务器 DATABASE_URL
    log("读取服务器 .env DATABASE_URL ...");
    const envR = await run(`grep -E '^DATABASE_URL=' ${DEPLOY_DIR}/.env | head -1`, 30000);
    const urlLine = envR.out.split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (!urlLine) throw new Error("未找到 DATABASE_URL: " + envR.out);
    const rawUrl = urlLine.replace(/^DATABASE_URL=\s*"?|"?\s*$/g, "");
    log("DATABASE_URL 前缀: " + rawUrl.slice(0, 30) + "...");
    // 去掉 psql 不支持的 schema 参数
    const dbUrl = rawUrl.replace(/\?schema=[^&]*/, "");

    // 2. 上传 SQL 文件
    log("上传 SQL 文件 ...");
    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))));
    await run("mkdir -p /tmp/valtrix_sync", 15000);
    const files = [
      "D:/阀门网站/scripts/_valtrix_tmp/server_import_menu_about.sql",
      "D:/阀门网站/scripts/_valtrix_tmp/upd_rescats.sql",
      "D:/阀门网站/scripts/_valtrix_tmp/upd_ind_quality.sql",
    ];
    for (const f of files) {
      const name = f.split("/").pop();
      await new Promise((res, rej) => sftp.fastPut(f, "/tmp/valtrix_sync/" + name, (e) => (e ? rej(e) : res())));
      log("  上传 " + name);
    }

    // 3. 服务器 psql 可用性
    const which = await run("command -v psql || ls /usr/lib/postgresql/*/bin/psql 2>/dev/null | head -1", 15000);
    const psqlBin = which.out.trim().split("\n").pop();
    if (!psqlBin) throw new Error("服务器无 psql: " + which.out);
    log("psql: " + psqlBin);
    const psql = `PGPASSWORD_NEEDED`; // 实际使用 DATABASE_URL 内嵌密码

    // 4. 导入 menu + about_sections（TRUNCATE + 插入）
    log("导入 menu + about_sections ...");
    const imp = await run(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f /tmp/valtrix_sync/server_import_menu_about.sql`, 120000);
    const errLines = imp.out.split("\n").filter((l) => /ERROR|FATAL|ROLLBACK/i.test(l));
    log("import exit=" + imp.code + " errors=" + errLines.length);
    if (errLines.length) throw new Error("menu/about import 错误: " + errLines.join(" | "));

    // 5. 导入 resource_categories + industries（UPDATE）
    log("导入 resource_categories ...");
    const r1 = await run(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f /tmp/valtrix_sync/upd_rescats.sql`, 60000);
    const e1 = r1.out.split("\n").filter((l) => /ERROR|FATAL/i.test(l));
    if (e1.length) throw new Error("rescats 错误: " + e1.join(" | "));
    log("导入 industries ...");
    const r2 = await run(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f /tmp/valtrix_sync/upd_ind_quality.sql`, 60000);
    const e2 = r2.out.split("\n").filter((l) => /ERROR|FATAL/i.test(l));
    if (e2.length) throw new Error("industries 错误: " + e2.join(" | "));

    // 6. 验证
    log("验证 ...");
    const v1 = await run(`psql "${dbUrl}" -P pager=off -t -c "SELECT count(*) FROM menu;"`, 30000);
    const v2 = await run(`psql "${dbUrl}" -P pager=off -t -c "SELECT count(*) FROM about_sections WHERE \\"contentJa\\" IS NOT NULL AND \\"contentJa\\" <> '[]' AND \\"contentJa\\" <> '';"`, 30000);
    const v3 = await run(`psql "${dbUrl}" -P pager=off -t -c "SELECT count(*) FROM resource_categories WHERE \\"titleJa\\" IS NOT NULL AND \\"titleJa\\" <> '';"`, 30000);
    const v4 = await run(`psql "${dbUrl}" -P pager=off -t -c "SELECT count(*) FROM industries WHERE \\"taglineJa\\" IS NOT NULL AND \\"taglineJa\\" <> '';"`, 30000);
    log("menu count=" + v1.out.trim() + " | about contentJa 非空=" + v2.out.trim() + " | rescats titleJa=" + v3.out.trim() + " | industries taglineJa=" + v4.out.trim());
    const stale = await run(`psql "${dbUrl}" -P pager=off -t -c "SELECT count(*) FROM menu WHERE url LIKE '%petrochemical%' OR url LIKE '%water-treatment%' OR url LIKE '%/about/culture%' OR url LIKE '%/services/selection%' OR url LIKE '%/resources/catalogs%';"`, 30000);
    log("残留旧 url 条数=" + stale.out.trim() + "（应为 0）");
    log("=== DB 同步完成 ===");
  } catch (e) {
    log("DB 同步失败: " + e.message);
  }
  conn.end();
})();
