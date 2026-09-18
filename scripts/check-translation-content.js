const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("检查数据库中需要翻译的内容...\n");

  // 1. 产品
  const products = await prisma.product.findMany({ select: { id: true, name: true, model: true } });
  console.log(`1. 产品: ${products.length} 个`);
  products.forEach(p => console.log(`   - ${p.id}: ${p.name} (${p.model})`));

  // 2. 新闻
  const news = await prisma.news.findMany({ select: { id: true, title: true } });
  console.log(`\n2. 新闻: ${news.length} 篇`);
  news.forEach(n => console.log(`   - ${n.id}: ${n.title}`));

  // 3. 关于我们
  const aboutSections = await prisma.aboutSection.findMany({ select: { id: true, title: true, slug: true } });
  console.log(`\n3. 关于我们板块: ${aboutSections.length} 个`);
  aboutSections.forEach(a => console.log(`   - ${a.id}: ${a.title} (${a.slug})`));

  // 4. 行业应用
  const industries = await prisma.industry.findMany({ select: { id: true, name: true } });
  console.log(`\n4. 行业应用: ${industries.length} 个`);
  industries.forEach(i => console.log(`   - ${i.id}: ${i.name}`));

  // 5. 服务
  const services = await prisma.service.findMany({ select: { id: true, title: true } });
  console.log(`\n5. 服务: ${services.length} 个`);
  services.forEach(s => console.log(`   - ${s.id}: ${s.title}`));

  // 6. 招聘职位
  const careers = await prisma.career.findMany({ select: { id: true, title: true } });
  console.log(`\n6. 招聘职位: ${careers.length} 个`);
  careers.forEach(c => console.log(`   - ${c.id}: ${c.title}`));

  // 7. 资源
  const resources = await prisma.resource.findMany({ select: { id: true, title: true } });
  console.log(`\n7. 资源: ${resources.length} 个`);
  resources.forEach(r => console.log(`   - ${r.id}: ${r.title}`));

  console.log("\n检查完成！");
}

main().finally(() => prisma.$disconnect());
