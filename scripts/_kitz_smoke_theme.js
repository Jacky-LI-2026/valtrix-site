// 本地冒烟辅助：读取/切换 theme_config.templateSlug（仅本机 dev 库，用完请还原）。
//   node scripts/_kitz_smoke_theme.js --get
//   node scripts/_kitz_smoke_theme.js --set kitz-clean
"use strict";

const path = require("path");
const fs = require("fs");

// 本脚本由 node 直接运行（不经过 Next），故自行加载 .env / .env.local 里的 DATABASE_URL。
for (const f of [".env", ".env.local"]) {
  const p = path.join(__dirname, "..", f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// 本项目 Prisma Client 输出在 lib/generated/prisma（见 lib/prisma.ts），不是 @prisma/client
const { PrismaClient } = require("../lib/generated/prisma");
const prisma = new PrismaClient();

// Prisma 的 id 是 BigInt，JSON.stringify 默认会抛错
const J = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

(async () => {
  const args = process.argv.slice(2);
  try {
    const rows = await prisma.themeConfig.findMany({
      select: { id: true, siteId: true, templateSlug: true },
      orderBy: { id: "asc" },
    });
    console.log("theme_config rows: " + J(rows));

    const siteSelect = { id: true, templateSlug: true };
    let sites = [];
    try {
      sites = await prisma.site.findMany({ select: siteSelect });
      console.log("sites: " + J(sites));
    } catch (e) {
      console.log("sites: <unavailable> " + e.message);
    }

    if (args[0] === "--set") {
      const slug = args[1];
      if (!slug) {
        console.log("FAIL: --set needs a slug");
        process.exit(1);
      }
      const upd = await prisma.themeConfig.updateMany({ data: { templateSlug: slug } });
      console.log("updated theme_config rows: " + upd.count + " -> templateSlug=" + slug);
    }

    // 还原成「未配置」：templateSlug = NULL（与首次部署时的初始状态一致）
    if (args[0] === "--clear") {
      const upd = await prisma.themeConfig.updateMany({ data: { templateSlug: null } });
      console.log("cleared theme_config rows: " + upd.count + " -> templateSlug=NULL");
    }
  } catch (e) {
    console.log("ERR " + e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
