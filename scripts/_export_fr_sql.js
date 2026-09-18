// 导出 fr 相关数据 + 新闻图片变化为 SQL（服务器同步用）
// 输出 tmp/fr-sync.sql
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
(async () => {
  let sql = '-- fr 数据同步 + 新闻图片 + languages fr 启用\nBEGIN;\n';
  // languages fr 启用
  sql += `UPDATE "languages" SET "isActive" = true WHERE "code" = 'fr';\n`;
  // 行业
  const inds = await p.industry.findMany();
  for (const i of inds) {
    sql += `UPDATE "industries" SET "nameFr"=${esc(i.nameFr)}, "taglineFr"=${esc(i.taglineFr)}, "descriptionFr"=${esc(i.descriptionFr)}, "challengesFr"=${esc(i.challengesFr)}, "solutionsFr"=${esc(i.solutionsFr)}, "productsFr"=${esc(i.productsFr)}, "casesFr"=${esc(i.casesFr)} WHERE "id"=${i.id};\n`;
  }
  // 新闻（fr + 封面/content 图片）
  const news = await p.news.findMany();
  for (const n of news) {
    sql += `UPDATE "news" SET "titleFr"=${esc(n.titleFr)}, "summaryFr"=${esc(n.summaryFr)}, "contentFr"=${esc(n.contentFr)}, "coverImage"=${esc(n.coverImage)}, "content"=${esc(n.content)} WHERE "id"=${n.id};\n`;
  }
  // 资源
  const res = await p.resourceItem.findMany();
  for (const r of res) {
    sql += `UPDATE "resource_items" SET "titleFr"=${esc(r.titleFr)}, "descriptionFr"=${esc(r.descriptionFr)} WHERE "id"=${r.id};\n`;
  }
  // 职位
  const jobs = await p.job.findMany();
  for (const j of jobs) {
    sql += `UPDATE "jobs" SET "titleFr"=${esc(j.titleFr)}, "departmentFr"=${esc(j.departmentFr)}, "locationFr"=${esc(j.locationFr)}, "typeFr"=${esc(j.typeFr)}, "salaryFr"=${esc(j.salaryFr)}, "experienceFr"=${esc(j.experienceFr)}, "educationFr"=${esc(j.educationFr)}, "descriptionFr"=${esc(j.descriptionFr)}, "responsibilitiesFr"=${esc(j.responsibilitiesFr)}, "requirementsFr"=${esc(j.requirementsFr)}, "benefitsFr"=${esc(j.benefitsFr)} WHERE "id"=${j.id};\n`;
  }
  // 产品 + specs
  const prods = await p.product.findMany({ include: { productSpecs: true } });
  for (const pr of prods) {
    sql += `UPDATE "products" SET "nameFr"=${esc(pr.nameFr)}, "subtitleFr"=${esc(pr.subtitleFr)}, "summaryFr"=${esc(pr.summaryFr)}, "descriptionFr"=${esc(pr.descriptionFr)}, "featuresFr"=${esc(pr.featuresFr)} WHERE "id"=${pr.id};\n`;
    for (const s of pr.productSpecs) {
      sql += `UPDATE "product_specs" SET "labelFr"=${esc(s.labelFr)}, "valueFr"=${esc(s.valueFr)} WHERE "id"=${s.id};\n`;
    }
  }
  sql += 'COMMIT;\n';
  fs.writeFileSync('tmp/fr-sync.sql', sql, 'utf8');
  console.log('SQL 已生成 tmp/fr-sync.sql, 大小:', (sql.length / 1024).toFixed(1), 'KB');
  await p.$disconnect();
})();
