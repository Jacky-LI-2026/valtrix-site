const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.aiConfig.findFirst();
  if (config) {
    console.log('大模型配置:');
    console.log('  API URL:', config.apiUrl);
    console.log('  Model:', config.model);
    console.log('  API Key:', config.apiKey ? '已配置 (' + config.apiKey.substring(0, 10) + '...)' : '未配置');
  } else {
    console.log('未找到大模型配置');
  }
}

main().finally(() => prisma.$disconnect());
