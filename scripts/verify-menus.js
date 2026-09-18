const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查询所有一级菜单
  const topMenus = await prisma.menu.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' }
  });

  console.log('=== 后台菜单管理数据 ===\n');
  
  for (const menu of topMenus) {
    console.log('【' + menu.name + '】(' + menu.nameEn + ') -> ' + menu.url);
    
    // 手动查询子菜单
    const children = await prisma.menu.findMany({
      where: { parentId: menu.id },
      orderBy: { sortOrder: 'asc' }
    });
    
    if (children.length > 0) {
      for (const child of children) {
        console.log('  └─ ' + child.name + ' (' + child.nameEn + ') -> ' + child.url);
      }
    }
    console.log('');
  }

  const total = await prisma.menu.count();
  const topLevelCount = topMenus.length;
  console.log('=== 统计 ===');
  console.log('  一级菜单: ' + topLevelCount + ' 个');
  console.log('  二级菜单: ' + (total - topLevelCount) + ' 个');
  console.log('  总计: ' + total + ' 个菜单');
}

main().finally(() => prisma.$disconnect());
