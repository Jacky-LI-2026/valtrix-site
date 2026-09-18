const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 检查SiteConfig中的所有配置
  const configs = await prisma.siteConfig.findMany();
  console.log('SiteConfig 配置:');
  configs.forEach(c => {
    console.log(`  ${c.configKey}: ${JSON.stringify(c.configValue).substring(0, 100)}`);
  });
  
  // 检查是否有大模型相关的配置
  const aiConfigs = configs.filter(c => 
    c.configKey.toLowerCase().includes('ai') || 
    c.configKey.toLowerCase().includes('llm') || 
    c.configKey.toLowerCase().includes('model') ||
    c.configKey.toLowerCase().includes('translate')
  );
  
  console.log('\n大模型相关配置:');
  aiConfigs.forEach(c => {
    console.log(`  ${c.configKey}: ${JSON.stringify(c.configValue).substring(0, 200)}`);
  });
}

main().finally(() => prisma.$disconnect());
