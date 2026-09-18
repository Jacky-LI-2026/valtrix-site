const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.aboutSection.count();
  console.log('数据库中关于我们板块数量:', count);
  
  if (count > 0) {
    const sections = await prisma.aboutSection.findMany({
      select: { id: true, slug: true, title: true, status: true },
      orderBy: { sortOrder: 'asc' }
    });
    console.log('\n现有板块:');
    sections.forEach(s => {
      console.log(`  ID: ${s.id}, slug: ${s.slug}, title: ${s.title}, status: ${s.status}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
