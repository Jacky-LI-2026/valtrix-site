const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查找'新闻资讯'菜单项
  const newsMenu = await prisma.menu.findFirst({
    where: { name: '新闻资讯' }
  });
  
  if (newsMenu) {
    console.log('找到新闻资讯菜单:', newsMenu.id, newsMenu.name);
    
    // 修改为'新闻动态'
    await prisma.menu.update({
      where: { id: newsMenu.id },
      data: { name: '新闻动态' }
    });
    console.log('已修改为: 新闻动态');
  } else {
    console.log('未找到新闻资讯菜单，可能已经被修改过');
  }
}

main().finally(() => prisma.$disconnect());
