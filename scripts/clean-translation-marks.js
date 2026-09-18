const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("清理关于我们板块英文内容中的翻译标记...\n");

  // 1. 公司简介 (profile)
  console.log("1. 更新公司简介 (profile)...");
  await prisma.aboutSection.update({
    where: { slug: 'profile' },
    data: {
      titleEn: 'Company Profile',
      subtitleEn: 'Focused on diamond new materials and MPCVD equipment, paving the diamond road to future'
    }
  });
  console.log("   titleEn: Company Profile");
  console.log("   subtitleEn: Focused on diamond new materials and MPCVD equipment, paving the diamond road to future");

  // 2. 企业文化 (culture)
  console.log("\n2. 更新企业文化 (culture)...");
  await prisma.aboutSection.update({
    where: { slug: 'culture' },
    data: {
      titleEn: 'Corporate Culture',
      subtitleEn: 'Integrity, Innovation, Service, people-oriented, paving the diamond road to future'
    }
  });
  console.log("   titleEn: Corporate Culture");
  console.log("   subtitleEn: Integrity, Innovation, Service, people-oriented, paving the diamond road to future");

  // 3. 检查并清理content中的翻译标记
  console.log("\n3. 检查content中的翻译标记...");
  const sections = await prisma.aboutSection.findMany();
  for (const section of sections) {
    if (section.content && Array.isArray(section.content)) {
      let updated = false;
      const newContent = section.content.map(block => {
        const newBlock = { ...block };
        if (newBlock.headingEn && typeof newBlock.headingEn === 'string' && newBlock.headingEn.includes('[翻译结果]')) {
          newBlock.headingEn = newBlock.headingEn.replace('[翻译结果]', '').trim();
          updated = true;
          console.log(`   ${section.slug}: 清理headingEn翻译标记`);
        }
        if (newBlock.paragraphsEn && Array.isArray(newBlock.paragraphsEn)) {
          newBlock.paragraphsEn = newBlock.paragraphsEn.map(p => {
            if (typeof p === 'string' && p.includes('[翻译结果]')) {
              updated = true;
              return p.replace('[翻译结果]', '').trim();
            }
            return p;
          });
        }
        return newBlock;
      });
      if (updated) {
        await prisma.aboutSection.update({
          where: { id: section.id },
          data: { content: newContent }
        });
      }
    }
  }

  // 4. 验证结果
  console.log("\n4. 验证结果...");
  const verifySections = await prisma.aboutSection.findMany({
    select: { slug: true, title: true, titleEn: true, subtitleEn: true },
    orderBy: { sortOrder: 'asc' }
  });
  for (const s of verifySections) {
    console.log(`   ${s.slug}: ${s.title} → ${s.titleEn}`);
    console.log(`     副标题: ${s.subtitleEn}`);
  }

  console.log("\n✅ 清理完成！");
}

main().finally(() => prisma.$disconnect());
