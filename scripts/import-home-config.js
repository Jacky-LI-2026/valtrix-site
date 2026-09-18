const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 检查是否已存在首页配置
  const existing = await prisma.homeConfig.findFirst({
    where: { isActive: true }
  });

  const homeConfig = {
    name: "默认首页配置",
    isActive: true,
    banners: [
      {
        title: "自主研发",
        titleEn: "Independent R&D",
        subtitle: "碳寻未来",
        subtitleEn: "Paving the Diamond Road to Future",
        description: "左文科技专注MPCVD金刚石材料制备核心工艺，自主研发2.45GHz及915MHz频段微波等离子体化学气相沉积设备，实现从设备制造到金刚石产品应用的全链条核心技术。",
        descriptionEn: "ZUO WEN TECHNOLOGY focuses on MPCVD diamond material preparation core technology, independently developing 2.45GHz and 915MHz microwave plasma CVD equipment, achieving full-chain core technology from equipment manufacturing to diamond product applications.",
        ctaText: "浏览产品",
        ctaTextEn: "Browse Products",
        ctaLink: "/products",
        bgGradient: "from-[#800000] via-[#CC0000] to-[#990000]",
        sortOrder: 1
      },
      {
        title: "全产业链",
        titleEn: "Full Industry Chain",
        subtitle: "自主可控",
        subtitleEn: "Independent and Controllable",
        description: "掌握CVD金刚石合成工艺、关键设备、原辅材料核心技术与自主知识产权，深圳量产基地实现工业与珠宝级金刚石规模化生产。",
        descriptionEn: "Mastering CVD diamond synthesis technology, key equipment, raw material core technology and independent intellectual property rights, Shenzhen mass production base achieves industrial and jewelry-grade diamond large-scale production.",
        ctaText: "了解实力",
        ctaTextEn: "Learn More",
        ctaLink: "/about",
        bgGradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
        sortOrder: 2
      },
      {
        title: "全球服务",
        titleEn: "Global Service",
        subtitle: "快速响应",
        subtitleEn: "Quick Response",
        description: "北京总部 + 深圳量产基地双轮驱动，产品与服务覆盖中国、东南亚、欧洲、北美等地区，提供本地化技术支持与售后服务。",
        descriptionEn: "Beijing headquarters + Shenzhen mass production base dual-wheel drive, products and services covering China, Southeast Asia, Europe, North America and other regions, providing localized technical support and after-sales service.",
        ctaText: "联系我们",
        ctaTextEn: "Contact Us",
        ctaLink: "/contact",
        bgGradient: "from-[#2d3436] via-[#636e72] to-[#2d3436]",
        sortOrder: 3
      }
    ],
    stats: [
      { value: "24+", valueEn: "24+", label: "产品系列", labelEn: "Product Series" },
      { value: "6", valueEn: "6", label: "应用领域", labelEn: "Industries" },
      { value: "ISO4", valueEn: "ISO4", label: "专利技术", labelEn: "Patents" },
      { value: "100%", valueEn: "100%", label: "氦检漏认证", labelEn: "Helium Leak Test" }
    ],
    features: [],
    featuredProducts: [],
    showNews: true,
    showIndustries: true,
    showServices: true,
    ctaTitle: "需要专业的金刚石材料解决方案？",
    ctaSubtitle: "我们的技术团队将为您提供一对一的专业咨询与定制化服务",
    ctaButtonText: "立即咨询",
    ctaButtonLink: "/contact"
  };

  if (existing) {
    console.log("首页配置已存在，更新中...");
    await prisma.homeConfig.update({
      where: { id: existing.id },
      data: homeConfig
    });
    console.log("首页配置已更新");
  } else {
    console.log("创建首页配置...");
    await prisma.homeConfig.create({
      data: homeConfig
    });
    console.log("首页配置已创建");
  }

  // 验证
  const verify = await prisma.homeConfig.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, banners: true, stats: true }
  });
  console.log("\n验证: 首页配置已保存");
  console.log("  ID:", verify.id);
  console.log("  名称:", verify.name);
  console.log("  轮播图数量:", verify.banners?.length || 0);
  console.log("  统计数据数量:", verify.stats?.length || 0);
}

main().finally(() => prisma.$disconnect());
