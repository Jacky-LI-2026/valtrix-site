const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查找'新闻动态'菜单项并恢复为'新闻资讯'
  const newsMenu = await prisma.menu.findFirst({
    where: { name: '新闻动态' }
  });
  
  if (newsMenu) {
    await prisma.menu.update({
      where: { id: newsMenu.id },
      data: { name: '新闻资讯' }
    });
    console.log('已恢复为: 新闻资讯');
  } else {
    console.log('未找到新闻动态菜单');
  }
}

main().finally(() => prisma.$disconnect());
