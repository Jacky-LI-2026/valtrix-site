const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 翻译单个文本
async function translateText(text, targetLang) {
  if (!text || text.trim() === '') return text;
  
  try {
    const res = await fetch('http://localhost:3000/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.translatedText) {
        return data.translatedText;
      }
    }
  } catch (e) {
    console.error(`翻译失败 (${targetLang}):`, e.message);
  }
  
  return text;
}

// 翻译产品
async function translateProducts() {
  console.log('\n=== 翻译产品 ===');
  const products = await prisma.product.findMany();
  console.log(`找到 ${products.length} 个产品`);
  
  const targetLangs = ['ja', 'ko', 'fr', 'ar'];
  
  for (const product of products) {
    console.log(`\n翻译产品: ${product.name} (${product.model})`);
    
    const updates = {};
    
    for (const lang of targetLangs) {
      const langSuffix = lang.charAt(0).toUpperCase() + lang.slice(1);
      
      // 翻译名称
      if (product.name && !product[`name${langSuffix}`]) {
        updates[`name${langSuffix}`] = await translateText(product.name, lang);
        console.log(`  ${lang} 名称: ${updates[`name${langSuffix}`]}`);
      }
      
      // 翻译副标题
      if (product.subtitle && !product[`subtitle${langSuffix}`]) {
        updates[`subtitle${langSuffix}`] = await translateText(product.subtitle, lang);
        console.log(`  ${lang} 副标题: ${updates[`subtitle${langSuffix}`]?.substring(0, 50)}...`);
      }
      
      // 翻译摘要
      if (product.summary && !product[`summary${langSuffix}`]) {
        updates[`summary${langSuffix}`] = await translateText(product.summary, lang);
        console.log(`  ${lang} 摘要: ${updates[`summary${langSuffix}`]?.substring(0, 50)}...`);
      }
      
      // 翻译详细描述
      if (product.description && !product[`description${langSuffix}`]) {
        updates[`description${langSuffix}`] = await translateText(product.description, lang);
        console.log(`  ${lang} 描述: ${updates[`description${langSuffix}`]?.substring(0, 50)}...`);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updates,
      });
      console.log(`  ✅ 已保存 ${Object.keys(updates).length} 个字段`);
    } else {
      console.log(`  ⏭️  无需翻译（已有翻译或无内容）`);
    }
  }
}

// 主函数
async function main() {
  console.log('开始批量翻译...');
  console.log('目标语言: 日文(ja), 韩文(ko), 法文(fr), 阿拉伯文(ar)');
  
  await translateProducts();
  
  console.log('\n=== 批量翻译完成 ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
