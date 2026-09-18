// 查 languages 表
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ls = await p.language.findMany({ orderBy: [{ sortOrder: 'asc' }] });
  console.log(JSON.stringify(ls.map((l) => ({ id: String(l.id), code: l.code, isActive: l.isActive, isDefault: l.isDefault, sortOrder: l.sortOrder }))));
  await p.$disconnect();
})();
