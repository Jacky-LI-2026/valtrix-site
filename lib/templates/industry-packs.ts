/**
 * 行业包（Industry Packs）：行业预设数据包
 * =====================================================
 * 新站一键初始化：选定行业 → 自动生成该行业的内容骨架
 * （对照菜单位 / 首页区块偏好 / SEO 关键词 / 默认文案 / 适用模板）。
 *
 * 数据结构：
 *  - slug/name：行业标识与名称
 *  - templateSlug：推荐模板（默认模板）
 *  - sections：推荐的首页区块顺序
 *  - menu：推荐的导航菜单结构（一二级）
 *  - seo：默认 SEO 关键词、描述
 *  - placeholders：该行业通用的占位文案（标题/副标题/关于我们/服务/联系方式）
 *  - keywords：多语言关键词（zh/en）
 */

export interface IndustryPack {
  slug: string;
  name: string;
  nameEn: string;
  templateSlug: string;
  sections: string[];
  menu: { label: string; href: string; children?: { label: string; href: string }[] }[];
  seo: { title: string; description: string; keywords: string };
  placeholders: {
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    aboutText: string;
    serviceTitle: string;
    serviceText: string;
  };
  keywords: { zh: string; en: string };
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    slug: "petrochemical",
    name: "石油化工",
    nameEn: "Petrochemical",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
        { label: "焊接接头", href: "/products?tab=welded-fittings" },
        { label: "单向阀", href: "/products?tab=check-valves" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "关于我们", href: "/about" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "石油化工阀门 - 工业阀门供应商",
      description: "VALTRIX为石油化工行业提供闸阀、球阀、止回阀、安全阀等全系列工业阀门，耐高温高压、耐腐蚀，保障装置安全稳定运行。",
      keywords: "石油化工阀门,炼化阀门,高温高压阀门,不锈钢阀门,API6D",
    },
    placeholders: {
      heroTitle: "严苛工况下的可靠流体控制",
      heroSubtitle: "为石油化工行业提供耐高温、耐腐蚀、低泄漏的高品质阀门",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX深耕工业阀门领域，为石油化工客户提供全系列阀门与流体控制解决方案。",
      serviceTitle: "服务范围",
      serviceText: "阀门选型、技术支持、维修保养与备件供应。",
    },
    keywords: { zh: "石油化工,炼化,阀门", en: "petrochemical,refinery,valve" },
  },
  {
    slug: "water-treatment",
    name: "水处理",
    nameEn: "Water Treatment",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "隔膜阀", href: "/products?tab=diaphragm-valves" },
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
        { label: "单向阀", href: "/products?tab=check-valves" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "水处理阀门 - 市政与工业水系统阀门",
      description: "VALTRIX为市政供水、污水处理与工业循环水系统提供蝶阀、闸阀、止回阀等阀门产品，耐腐蚀、密封可靠。",
      keywords: "水处理阀门,蝶阀,闸阀,止回阀,市政供水阀门",
    },
    placeholders: {
      heroTitle: "守护每一滴水的品质",
      heroSubtitle: "市政与工业水系统的高效、耐腐蚀阀门解决方案",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX为水处理行业提供可靠的阀门产品，保障水质安全与系统稳定运行。",
      serviceTitle: "服务范围",
      serviceText: "阀门选型、安装指导、维护保养与备件供应。",
    },
    keywords: { zh: "水处理,市政供水,阀门", en: "water treatment,municipal water,valve" },
  },
  {
    slug: "natural-gas",
    name: "天然气",
    nameEn: "Natural Gas",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "焊接接头", href: "/products?tab=welded-fittings" },
        { label: "安全阀系列", href: "/products?tab=safety-valve" },
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "天然气阀门 - 燃气输配系统安全阀门",
      description: "VALTRIX为天然气输配、城镇燃气与 LNG 领域提供球阀、安全阀、止回阀等产品，零泄漏、高可靠性。",
      keywords: "天然气阀门,燃气阀门,球阀,安全阀,零泄漏",
    },
    placeholders: {
      heroTitle: "燃气安全，阀门把关",
      heroSubtitle: "天然气输配系统的安全可靠阀门解决方案",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX为天然气行业提供高可靠性阀门，保障燃气输配安全。",
      serviceTitle: "服务范围",
      serviceText: "阀门选型、气密检测、维修保养与备件供应。",
    },
    keywords: { zh: "天然气,燃气,阀门", en: "natural gas,gas distribution,valve" },
  },
  {
    slug: "power",
    name: "电力能源",
    nameEn: "Power & Energy",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "调节阀系列", href: "/products?tab=regulating-valve" },
        { label: "安全阀系列", href: "/products?tab=safety-valve" },
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "电力阀门 - 电站高温高压阀门",
      description: "VALTRIX为火电、核电与新能源电力提供高温高压阀门、调节阀与安全阀，性能稳定、安全可靠。",
      keywords: "电力阀门,电站阀门,高温高压,调节阀,安全阀",
    },
    placeholders: {
      heroTitle: "高温高压下的可靠之选",
      heroSubtitle: "为电力能源行业提供高品质电站阀门",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX为电力行业提供耐高温高压的阀门产品与解决方案。",
      serviceTitle: "服务范围",
      serviceText: "阀门选型、检修服务、备件供应与技术支持。",
    },
    keywords: { zh: "电力,电站,阀门", en: "power,power plant,valve" },
  },
  {
    slug: "metallurgy-mining",
    name: "冶金矿业",
    nameEn: "Metallurgy & Mining",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "隔膜阀", href: "/products?tab=diaphragm-valves" },
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
        { label: "单向阀", href: "/products?tab=check-valves" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "冶金矿业阀门 - 耐磨耐蚀阀门",
      description: "VALTRIX为冶金与矿业行业提供耐磨、耐蚀阀门，应对矿浆、高温与腐蚀工况。",
      keywords: "冶金阀门,矿山阀门,耐磨阀门,耐腐蚀阀门",
    },
    placeholders: {
      heroTitle: "耐磨耐蚀，应对严苛工况",
      heroSubtitle: "为冶金矿业提供耐磨耐蚀的阀门产品",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX为冶金矿业提供耐磨耐蚀阀门，保障生产连续稳定。",
      serviceTitle: "服务范围",
      serviceText: "阀门选型、耐磨改造、维修保养与备件供应。",
    },
    keywords: { zh: "冶金,矿业,阀门", en: "metallurgy,mining,valve" },
  },
  {
    slug: "marine-offshore",
    name: "船舶海工",
    nameEn: "Marine & Offshore",
    templateSlug: "t2-industrial",
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
    menu: [
      { label: "首页", href: "/" },
      { label: "产品中心", href: "/products", children: [
        { label: "VCR 面密封接头", href: "/products?tab=vcr-fittings" },
        { label: "单向阀", href: "/products?tab=check-valves" },
        { label: "焊接接头", href: "/products?tab=welded-fittings" },
      ]},
      { label: "应用领域", href: "/industries" },
      { label: "服务支持", href: "/services" },
      { label: "联系我们", href: "/contact" },
    ],
    seo: {
      title: "船用阀门 - 船级社认证船用阀门",
      description: "VALTRIX为船舶与海工平台提供通过船级社认证的船用阀门，耐海水腐蚀，密封可靠。",
      keywords: "船用阀门,海工阀门,船级社认证,耐腐蚀阀门",
    },
    placeholders: {
      heroTitle: "深海与远洋的可靠伙伴",
      heroSubtitle: "通过船级社认证的船用阀门解决方案",
      aboutTitle: "关于我们",
      aboutText: "VALTRIX为船舶海工提供耐海水腐蚀的船用阀门产品。",
      serviceTitle: "服务范围",
      serviceText: "船用阀门选型、认证支持、维修保养与备件供应。",
    },
    keywords: { zh: "船舶,海工,船用阀门", en: "marine,offshore,marine valve" },
  },
];

export const INDUSTRY_PACK_MAP: Record<string, IndustryPack> = Object.fromEntries(
  INDUSTRY_PACKS.map((p) => [p.slug, p])
);
