const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查找最大的sortOrder
  const maxSort = await prisma.menu.aggregate({
    _max: { sortOrder: true }
  });
  const nextSort = (maxSort._max.sortOrder || 0) + 1;
  
  // 添加"测试"菜单项
  const testMenu = await prisma.menu.create({
    data: {
      name: '测试',
      nameEn: 'Test',
      url: '/test',
      icon: 'test',
      sortOrder: nextSort,
      isActive: true,
      parentId: null
    }
  });
  
  console.log('已添加测试菜单:');
  console.log('  ID:', testMenu.id);
  console.log('  名称:', testMenu.name);
  console.log('  英文名称:', testMenu.nameEn);
  console.log('  URL:', testMenu.url);
  console.log('  排序:', testMenu.sortOrder);
  console.log('  启用:', testMenu.isActive);
}

main().finally(() => prisma.$disconnect());
