const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.industry.count();
  console.log('数据库中行业数量:', count);
  
  if (count > 0) {
    const industries = await prisma.industry.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { sortOrder: 'asc' }
    });
    console.log('\n行业列表:');
    industries.forEach(i => {
      console.log(`  ID: ${i.id}, slug: ${i.slug}, name: ${i.name}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
