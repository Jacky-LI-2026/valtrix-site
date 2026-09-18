/**
 * 前台导航菜单数据导入脚本
 * 将前台Header组件中的导航菜单结构导入到后台Menu表中
 * 运行方式: node scripts/import-menus.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始导入前台导航菜单数据...');

  // 先清空现有菜单数据
  await prisma.menu.deleteMany({});
  console.log('已清空现有菜单数据');

  // 定义一级菜单
  const topLevelMenus = [
    { name: '首页', nameEn: 'Home', url: '/', sortOrder: 1, icon: 'home' },
    { name: '产品中心', nameEn: 'Products', url: '/products', sortOrder: 2, icon: 'box' },
    { name: '应用领域', nameEn: 'Industries', url: '/industries', sortOrder: 3, icon: 'industry' },
    { name: '服务支持', nameEn: 'Services', url: '/services', sortOrder: 4, icon: 'service' },
    { name: '资源中心', nameEn: 'Resources', url: '/resources', sortOrder: 5, icon: 'book' },
    { name: '新闻资讯', nameEn: 'News', url: '/news', sortOrder: 6, icon: 'newspaper' },
    { name: '关于我们', nameEn: 'About', url: '/about', sortOrder: 7, icon: 'info' },
    { name: '加入我们', nameEn: 'Careers', url: '/careers', sortOrder: 8, icon: 'users' },
    { name: '联系我们', nameEn: 'Contact', url: '/contact', sortOrder: 9, icon: 'phone' },
  ];

  // 创建一级菜单并记录ID
  const menuIds = {};
  for (const menu of topLevelMenus) {
    const created = await prisma.menu.create({
      data: {
        name: menu.name,
        nameEn: menu.nameEn,
        url: menu.url,
        sortOrder: menu.sortOrder,
        isActive: true,
        icon: menu.icon,
      },
    });
    menuIds[menu.name] = Number(created.id);
    console.log(`  创建一级菜单: ${menu.name} (ID: ${created.id})`);
  }

  // 定义二级菜单
  const subMenus = [
    // 产品中心子菜单
    { parent: '产品中心', name: 'MPCVD长晶设备', nameEn: 'MPCVD Equipment', url: '/products?tab=growth', sortOrder: 1 },
    { parent: '产品中心', name: '配套设备', nameEn: 'Auxiliary Equipment', url: '/products?tab=auxiliary', sortOrder: 2 },
    { parent: '产品中心', name: '培育钻石', nameEn: 'Lab-Grown Diamonds', url: '/products?tab=diamonds', sortOrder: 3 },
    { parent: '产品中心', name: '金刚石功能材料', nameEn: 'Diamond Materials', url: '/products?tab=materials', sortOrder: 4 },
    // 应用领域子菜单
    { parent: '应用领域', name: '珠宝首饰', nameEn: 'Jewelry', url: '/industries/jewelry', sortOrder: 1 },
    { parent: '应用领域', name: '半导体', nameEn: 'Semiconductor', url: '/industries/semiconductor', sortOrder: 2 },
    { parent: '应用领域', name: '精密加工', nameEn: 'Precision Machining', url: '/industries/precision-machining', sortOrder: 3 },
    { parent: '应用领域', name: '量子科技', nameEn: 'Quantum Technology', url: '/industries/quantum-technology', sortOrder: 4 },
    { parent: '应用领域', name: '光学', nameEn: 'Optics', url: '/industries/optics', sortOrder: 5 },
    { parent: '应用领域', name: '新能源', nameEn: 'New Energy', url: '/industries/new-energy', sortOrder: 6 },
    // 服务支持子菜单
    { parent: '服务支持', name: 'ODM定制服务', nameEn: 'ODM Service', url: '/services/odm', sortOrder: 1 },
    { parent: '服务支持', name: 'MPCVD工艺服务', nameEn: 'MPCVD Process Service', url: '/services/mpcvd', sortOrder: 2 },
    { parent: '服务支持', name: '技术支持', nameEn: 'Technical Support', url: '/services/technical-support', sortOrder: 3 },
    { parent: '服务支持', name: '售后服务', nameEn: 'After-sales Service', url: '/services/after-sales', sortOrder: 4 },
    // 资源中心子菜单
    { parent: '资源中心', name: '产品样本', nameEn: 'Catalogs', url: '/resources/catalogs', sortOrder: 1 },
    { parent: '资源中心', name: '资质认证', nameEn: 'Certificates', url: '/resources/certificates', sortOrder: 2 },
    { parent: '资源中心', name: '图纸下载', nameEn: 'Drawings', url: '/resources/drawings', sortOrder: 3 },
    // 关于我们子菜单
    { parent: '关于我们', name: '公司简介', nameEn: 'Company Profile', url: '/about/profile', sortOrder: 1 },
    { parent: '关于我们', name: '企业文化', nameEn: 'Company Culture', url: '/about/culture', sortOrder: 2 },
    { parent: '关于我们', name: '发展历程', nameEn: 'Our History', url: '/about/history', sortOrder: 3 },
    { parent: '关于我们', name: '资质荣誉', nameEn: 'Honors & Awards', url: '/about/honors', sortOrder: 4 },
  ];

  // 创建二级菜单
  for (const menu of subMenus) {
    const parentId = menuIds[menu.parent];
    if (!parentId) {
      console.log(`  警告: 未找到父菜单 "${menu.parent}"，跳过子菜单 "${menu.name}"`);
      continue;
    }
    await prisma.menu.create({
      data: {
        name: menu.name,
        nameEn: menu.nameEn,
        url: menu.url,
        parentId: BigInt(parentId),
        sortOrder: menu.sortOrder,
        isActive: true,
      },
    });
    console.log(`  创建二级菜单: ${menu.parent} > ${menu.name}`);
  }

  // 统计
  const totalCount = await prisma.menu.count();
  const topLevelCount = await prisma.menu.count({ where: { parentId: null } });
  const subLevelCount = totalCount - topLevelCount;

  console.log('\n=== 导入完成 ===');
  console.log(`  一级菜单: ${topLevelCount} 个`);
  console.log(`  二级菜单: ${subLevelCount} 个`);
  console.log(`  总计: ${totalCount} 个菜单`);
}

main()
  .catch((e) => {
    console.error('导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
