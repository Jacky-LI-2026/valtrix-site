// 从本地 DB 读取 6 张表的多语言字段，生成 UPDATE SQL 供服务器执行
// 用法: node scripts/_sync_data_to_server.js
const { PrismaClient } = require("D:/阀门网站/lib/generated/prisma");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const out = [];

// jsonb columns must always be JSON.stringify'd (even if value is a string)
const JSONB_FIELDS = new Set([
  "tags","tagsEn","tagsJa","tagsKo","tagsFr","tagsAr",
  "description","descriptionEn","descriptionJa","descriptionKo","descriptionFr","descriptionAr",
  "responsibilities","responsibilitiesEn","responsibilitiesJa","responsibilitiesKo","responsibilitiesFr","responsibilitiesAr",
  "requirements","requirementsEn","requirementsJa","requirementsKo","requirementsFr","requirementsAr",
  "benefits","benefitsEn","benefitsJa","benefitsKo","benefitsFr","benefitsAr",
  "features","featuresEn","featuresJa","featuresKo","featuresFr","featuresAr",
  "process","processEn","processJa","processKo","processFr","processAr",
  "banners","stats",
  "challenges","challengesEn","challengesJa","challengesKo","challengesFr","challengesAr",
  "solutions","solutionsEn","solutionsJa","solutionsKo","solutionsFr","solutionsAr",
  "products","productsEn","productsJa","productsKo","productsFr","productsAr",
  "cases","casesEn","casesJa","casesKo","casesFr","casesAr",
  "relatedProductSlugs","relatedIndustrySlugs",
  "images","priceTiers","frames360","specs",
]);

function escStr(v, field) {
  if (v === null || v === undefined) return "NULL";
  if (JSONB_FIELDS.has(field)) return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function genUpdates(table, records, fields, idField = "id") {
  for (const r of records) {
    const sets = fields.map((f) => `"${f}" = ${escStr(r[f], f)}`).join(", ");
    out.push(`UPDATE "${table}" SET ${sets} WHERE "${idField}" = ${r[idField]};`);
  }
  console.log(`  ${table}: ${records.length} records, ${fields.length} fields each`);
}

async function main() {
  console.log("Reading local DB...");

  // 1. jobs - all multilingual fields
  const jobs = await prisma.job.findMany({ orderBy: { id: "asc" } });
  const jobFields = [
    "title","titleEn","titleJa","titleKo","titleFr","titleAr",
    "department","departmentEn","departmentJa","departmentKo","departmentFr","departmentAr",
    "location","locationEn","locationJa","locationKo","locationFr","locationAr",
    "type","typeEn","typeJa","typeKo","typeFr","typeAr",
    "salary","salaryEn","salaryJa","salaryKo","salaryFr","salaryAr",
    "experience","experienceEn","experienceJa","experienceKo","experienceFr","experienceAr",
    "education","educationEn","educationJa","educationKo","educationFr","educationAr",
    "tags","tagsEn","tagsJa","tagsKo","tagsFr","tagsAr",
    "description","descriptionEn","descriptionJa","descriptionKo","descriptionFr","descriptionAr",
    "responsibilities","responsibilitiesEn","responsibilitiesJa","responsibilitiesKo","responsibilitiesFr","responsibilitiesAr",
    "requirements","requirementsEn","requirementsJa","requirementsKo","requirementsFr","requirementsAr",
    "benefits","benefitsEn","benefitsJa","benefitsKo","benefitsFr","benefitsAr",
  ];
  genUpdates("jobs", jobs, jobFields);

  // 2. services - process fields + other multilingual
  const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
  const svcFields = [
    "title","titleEn","titleJa","titleKo","titleFr","titleAr",
    "subtitle","subtitleEn","subtitleJa","subtitleKo","subtitleFr","subtitleAr",
    "description","descriptionEn","descriptionJa","descriptionKo","descriptionFr","descriptionAr",
    "features","featuresEn","featuresJa","featuresKo","featuresFr","featuresAr",
    "process","processEn","processJa","processKo","processFr","processAr",
  ];
  genUpdates("services", services, svcFields);

  // 3. home_config - banners jsonb + cta fields
  const homeConfigs = await prisma.homeConfig.findMany({ orderBy: { id: "asc" } });
  const hcFields = ["banners","features","stats",
    "ctaTitle","ctaTitleEn","ctaTitleJa","ctaTitleKo","ctaTitleFr","ctaTitleAr",
    "ctaSubtitle","ctaSubtitleEn","ctaSubtitleJa","ctaSubtitleKo","ctaSubtitleFr","ctaSubtitleAr",
    "ctaButtonText","ctaButtonTextEn","ctaButtonTextJa","ctaButtonTextKo","ctaButtonTextFr","ctaButtonTextAr",
  ];
  genUpdates("home_config", homeConfigs, hcFields);

  // 4. products - multilingual fields (only update products that were changed)
  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const prodFields = [
    "name","nameEn","nameJa","nameKo","nameFr","nameAr",
    "subtitle","subtitleEn","subtitleJa","subtitleKo","subtitleFr","subtitleAr",
    "summary","summaryEn","summaryJa","summaryKo","summaryFr","summaryAr",
    "description","descriptionEn","descriptionJa","descriptionKo","descriptionFr","descriptionAr",
    "features","featuresEn","featuresJa","featuresKo","featuresFr","featuresAr",
    "model",
  ];
  genUpdates("products", products, prodFields);

  // 5. industries
  const industries = await prisma.industry.findMany({ orderBy: { id: "asc" } });
  const indFields = [
    "name","nameEn","nameJa","nameKo","nameFr","nameAr",
    "tagline","taglineEn","taglineJa","taglineKo","taglineFr","taglineAr",
    "description","descriptionEn","descriptionJa","descriptionKo","descriptionFr","descriptionAr",
    "challenges","challengesEn","challengesJa","challengesKo","challengesFr","challengesAr",
    "solutions","solutionsEn","solutionsJa","solutionsKo","solutionsFr","solutionsAr",
  ];
  genUpdates("industries", industries, indFields);

  // 6. news
  const news = await prisma.news.findMany({ orderBy: { id: "asc" } });
  const newsFields = [
    "title","titleEn","titleJa","titleKo","titleFr","titleAr",
    "summary","summaryEn","summaryJa","summaryKo","summaryFr","summaryAr",
    "content","contentEn","contentJa","contentKo","contentFr","contentAr",
  ];
  genUpdates("news", news, newsFields);

  const sql = "-- VALTRIX data sync 2026-09-09\n-- Generated from local DB, apply on server via psql\n-- Tables: jobs, services, home_config, products, industries, news\nBEGIN;\n" + out.join("\n") + "\nCOMMIT;\n";
  const outPath = path.join(__dirname, "..", "_qa_audit_20260909", "data-sync-update-20260909.sql");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`\nGenerated ${out.length} UPDATE statements`);
  console.log(`Saved to: ${outPath}`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
