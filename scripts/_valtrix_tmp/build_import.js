// 构建服务器导入 SQL：清理 PG17 专属行 + TRUNCATE 包装
const fs = require("fs");
const src = "D:/阀门网站/scripts/_valtrix_tmp/dump_menu_about.sql";
const out = "D:/阀门网站/scripts/_valtrix_tmp/server_import_menu_about.sql";

let c = fs.readFileSync(src, "utf8");

// 清理 PG17/本机专属行
const lines = c.split(/\r?\n/).filter((l) => {
  const t = l.trim();
  if (t.startsWith("\\restrict")) return false;
  if (t.startsWith("\\unrestrict")) return false;
  if (t.includes("set_config('search_path'")) return false;
  if (t.startsWith("SET transaction_timeout")) return false;
  if (t.startsWith("SET client_encoding")) return false;
  if (t.startsWith("-- Dumped from database version")) return false;
  if (t.startsWith("-- Dumped by pg_dump version")) return false;
  return true;
});
c = lines.join("\n");

const header = `-- VALTRIX 服务器同步：menu + about_sections（TRUNCATE + 插入）
\\set ON_ERROR_STOP on
TRUNCATE TABLE menu, about_sections;
SET session_replication_role = replica;
`;

const footer = `
SET session_replication_role = DEFAULT;
SELECT setval('menu_id_seq', (SELECT MAX(id) FROM menu));
SELECT setval('about_sections_id_seq', (SELECT MAX(id) FROM about_sections));
`;

fs.writeFileSync(out, header + c + footer);
console.log("written", out, fs.statSync(out).size, "bytes");
