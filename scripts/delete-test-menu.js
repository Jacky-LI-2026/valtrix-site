const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 删除"测试"菜单项
  const result = await prisma.menu.deleteMany({
    where: { name: '测试' }
  });
  
  console.log('已删除测试菜单，数量:', result.count);
}

main().finally(() => prisma.$disconnect());
