const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("检查关于我们板块的英文内容...\n");
  
  const sections = await prisma.aboutSection.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  for (const section of sections) {
    console.log(`=== 板块: ${section.title} (slug: ${section.slug}) ===`);
    console.log(`  titleEn: ${section.titleEn}`);
    console.log(`  subtitleEn: ${section.subtitleEn}`);
    
    // 检查content中的英文内容
    if (section.content) {
      const content = section.content;
      if (Array.isArray(content)) {
        content.forEach((block, i) => {
          if (block.headingEn && block.headingEn.includes('[翻译结果]')) {
            console.log(`  content[${i}].headingEn: ${block.headingEn}`);
          }
          if (block.paragraphsEn && Array.isArray(block.paragraphsEn)) {
            block.paragraphsEn.forEach((p, j) => {
              if (p.includes('[翻译结果]')) {
                console.log(`  content[${i}].paragraphsEn[${j}]: ${p.substring(0, 100)}...`);
              }
            });
          }
        });
      }
    }
    
    // 检查highlights中的英文内容
    if (section.highlights) {
      const highlights = section.highlights;
      if (Array.isArray(highlights)) {
        highlights.forEach((h, i) => {
          if (h.labelEn && h.labelEn.includes('[翻译结果]')) {
            console.log(`  highlights[${i}].labelEn: ${h.labelEn}`);
          }
          if (h.valueEn && h.valueEn.includes('[翻译结果]')) {
            console.log(`  highlights[${i}].valueEn: ${h.valueEn}`);
          }
        });
      }
    }
    
    console.log("");
  }
}

main().finally(() => prisma.$disconnect());
