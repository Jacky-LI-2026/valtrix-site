// 临时禁用本机 admin（模拟未初始化），测试后恢复
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

(async () => {
  const t = fs.readFileSync("D:/企业网站/.env", "utf8");
  const url = t.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)[1];
  const pr = new PrismaClient({ datasources: { db: { url } } });
  const u = await pr.user.findUnique({ where: { username: "admin" } });
  if (!u) { console.log("❌ 无 admin"); process.exit(1); }
  const mode = process.argv[2] || "disable";
  if (mode === "disable") {
    await pr.user.update({ where: { id: u.id }, data: { status: "disabled" } });
    console.log("✅ admin 已临时禁用（模拟未初始化）");
  } else if (mode === "restore") {
    await pr.user.update({ where: { id: u.id }, data: { status: "active" } });
    console.log("✅ admin 已恢复 active");
  } else if (mode === "cleanup") {
    // 删除测试账号并恢复 admin
    await pr.user.deleteMany({ where: { username: "testadmin" } });
    await pr.user.update({ where: { id: u.id }, data: { status: "active" } });
    console.log("✅ 已删除 testadmin 并恢复 admin");
  }
  await pr.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
