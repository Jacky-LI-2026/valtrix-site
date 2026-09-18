// 阀门网站基础种子：语言 / 产品Tab / 菜单 / 站点配置 / 首页配置 / 默认模板 / SEO
const { PrismaClient } = require("../lib/generated/prisma");
const prisma = new PrismaClient();

const LANGUAGES = [
  { code: "zh", name: "简体中文", nameEn: "Simplified Chinese", flag: "🇨🇳", isDefault: true, sortOrder: 1 },
  { code: "en", name: "English", nameEn: "English", flag: "🇺🇸", isDefault: false, sortOrder: 2 },
  { code: "ja", name: "日本語", nameEn: "Japanese", flag: "🇯🇵", isDefault: false, sortOrder: 3 },
  { code: "ko", name: "한국어", nameEn: "Korean", flag: "🇰🇷", isDefault: false, sortOrder: 4 },
  { code: "fr", name: "Français", nameEn: "French", flag: "🇫🇷", isDefault: false, sortOrder: 5 },
  { code: "ar", name: "العربية", nameEn: "Arabic", flag: "🇸🇦", isDefault: false, sortOrder: 6 },
];

const TABS = [
  { slug: "gate-valve", name: "闸阀", nameEn: "Gate Valves", sortOrder: 1 },
  { slug: "ball-valve", name: "球阀", nameEn: "Ball Valves", sortOrder: 2 },
  { slug: "butterfly-valve", name: "蝶阀", nameEn: "Butterfly Valves", sortOrder: 3 },
  { slug: "check-valve", name: "止回阀", nameEn: "Check Valves", sortOrder: 4 },
  { slug: "safety-valve", name: "安全阀", nameEn: "Safety Valves", sortOrder: 5 },
  { slug: "regulating-valve", name: "调节阀", nameEn: "Regulating Valves", sortOrder: 6 },
];

const MENUS = [
  { name: "首页", nameEn: "Home", url: "/", parent: null, sort: 1 },
  { name: "产品中心", nameEn: "Products", url: "/products", parent: null, sort: 2, children: [
    { name: "闸阀系列", nameEn: "Gate Valves", url: "/products?tab=gate-valve", sort: 1 },
    { name: "球阀系列", nameEn: "Ball Valves", url: "/products?tab=ball-valve", sort: 2 },
    { name: "蝶阀系列", nameEn: "Butterfly Valves", url: "/products?tab=butterfly-valve", sort: 3 },
    { name: "止回阀系列", nameEn: "Check Valves", url: "/products?tab=check-valve", sort: 4 },
    { name: "安全阀系列", nameEn: "Safety Valves", url: "/products?tab=safety-valve", sort: 5 },
    { name: "调节阀系列", nameEn: "Regulating Valves", url: "/products?tab=regulating-valve", sort: 6 },
  ]},
  { name: "应用领域", nameEn: "Industries", url: "/industries", parent: null, sort: 3, children: [
    { name: "石油化工", nameEn: "Petrochemical", url: "/industries/petrochemical", sort: 1 },
    { name: "水处理", nameEn: "Water Treatment", url: "/industries/water-treatment", sort: 2 },
    { name: "天然气", nameEn: "Natural Gas", url: "/industries/natural-gas", sort: 3 },
    { name: "电力能源", nameEn: "Power & Energy", url: "/industries/power-energy", sort: 4 },
    { name: "冶金矿业", nameEn: "Metallurgy & Mining", url: "/industries/metallurgy", sort: 5 },
    { name: "船舶海工", nameEn: "Marine", url: "/industries/marine", sort: 6 },
  ]},
  { name: "新闻资讯", nameEn: "News", url: "/news", parent: null, sort: 4 },
  { name: "服务支持", nameEn: "Services", url: "/services", parent: null, sort: 5, children: [
    { name: "阀门选型", nameEn: "Valve Selection", url: "/services/selection", sort: 1 },
    { name: "技术支持", nameEn: "Technical Support", url: "/services/technical-support", sort: 2 },
    { name: "售后服务", nameEn: "After-sales", url: "/services/after-sales", sort: 3 },
    { name: "资料下载", nameEn: "Downloads", url: "/resources/catalogs", sort: 4 },
  ]},
  { name: "在线商城", nameEn: "Online Shop", url: "/shop", parent: null, sort: 6 },
  { name: "关于我们", nameEn: "About Us", url: "/about", parent: null, sort: 7, children: [
    { name: "公司简介", nameEn: "Profile", url: "/about/profile", sort: 1 },
    { name: "企业文化", nameEn: "Culture", url: "/about/culture", sort: 2 },
    { name: "发展历程", nameEn: "History", url: "/about/history", sort: 3 },
  ]},
  { name: "联系我们", nameEn: "Contact", url: "/contact", parent: null, sort: 8 },
];

const CONTACT_INFO = {
  // 占位电话/地址已清除，请由后台「站点设置 → 联系方式」填写真实值
  phone: "",
  email: "sales@valtrix.com",
  address: "",
  // 占位地址已清除：留空数组，前台自动回退 address 字段，不再渲染空地址行
  addresses: [],
  logo: "/images/logo.png",
  socials: [],
  copyright: "VALTRIX Co., Ltd.",
};

const SITE_CONFIGS = [
  { code: "contact_info", configValue: CONTACT_INFO },
  { code: "oem", configValue: { frontendBrand: "VALTRIX", frontendBrandEn: "VALTRIX", frontendCopyright: "© VALTRIX Co., Ltd. VALTRIX TECHNOLOGY Co., Ltd. 版权所有", icp: "浙ICP备00000000号（示例）" } },
  { code: "shop_bank_info", configValue: { bankName: "中国工商银行温州瓯北支行", accountName: "VALTRIX Co., Ltd.", accountNo: "1200 0000 0000 0000 000", remark: "转账请备注订单号" } },
  { code: "SHIPPING_LIST", configValue: [{ name: "顺丰速运", key: "SF" }, { name: "跨越速运", key: "KY" }, { name: "京东物流", key: "JD" }] },
  { code: "shop_escalation_hours", configValue: 2 },
  { code: "manual_download_count", configValue: 0 },
];

const HOME_CONFIG = {
  name: "VALTRIX首页配置",
  banners: [
    {
      id: "banner-1", title: { zh: "流体控制专家", en: "Fluid Control Expert", ja: "流体制御の専門家", ko: "유체 제어 전문가", fr: "Expert en contrôle de fluides", ar: "خبير التحكم في السوائل" },
      subtitle: { zh: "品质阀门 精工制造", en: "Quality Valves, Precision Manufacturing", ja: "高品質バルブ・精密製造", ko: "고품질 밸브, 정밀 제조", fr: "Vannes de qualité, fabrication de précision", ar: "صمامات عالية الجودة، تصنيع دقيق" },
      description: { zh: "VALTRIX专注工业阀门研发制造20年，产品覆盖闸阀、球阀、蝶阀、止回阀、安全阀、调节阀六大系列，广泛应用于石油化工、水处理、天然气、电力能源等领域。", en: "VALTRIX has specialized in industrial valve R&D and manufacturing for 20 years, covering gate, ball, butterfly, check, safety and regulating valves for petrochemical, water treatment, natural gas and power industries.", ja: "バルブテックは20年にわたり工業用バルブの研究開発・製造に注力。ゲート、ボール、バタフライ、チェック、安全、調節の6シリーズを石油化学、水処理、天然ガス、電力などの分野に提供しています。", ko: "밸브텍는 20년간 산업용 밸브 연구개발 및 제조에 전념해 왔으며, 게이트, 볼, 버터플라이, 체크, 안전, 조절 밸브 6대 시리즈를 석유화학, 수처리, 천연가스, 전력 에너지 분야에 공급합니다.", fr: "VALTRIX se consacre à la R&D et à la fabrication de vannes industrielles depuis 20 ans, couvrant six séries de vannes pour la pétrochimie, le traitement de l'eau, le gaz naturel et l'énergie.", ar: "تتخصص فالف تك للصمامات في البحث والتطوير وتصنيع الصمامات الصناعية منذ 20 عامًا، وتغطي ست سلاسل رئيسية لصناعات البتروكيماويات ومعالجة المياه والغاز الطبيعي والطاقة." },
      ctaText: { zh: "浏览产品", en: "Browse Products", ja: "製品を見る", ko: "제품 보기", fr: "Voir les produits", ar: "تصفح المنتجات" },
      ctaLink: "/products",
      bgGradient: "from-[#1a2a3a] via-[#2d4a63] to-[#1a2a3a]",
      sortOrder: 1,
    },
    {
      id: "banner-2", title: { zh: "全系列阀门解决方案", en: "Full Range Valve Solutions", ja: "全シリーズバルブソリューション", ko: "전 시리즈 밸브 솔루션", fr: "Solutions complètes de vannes", ar: "حلول صمامات شاملة" },
      subtitle: { zh: "DN15-DN3000 全口径覆盖", en: "DN15-DN3000 Full Size Coverage", ja: "DN15-DN3000 全口径対応", ko: "DN15-DN3000 전체 구경", fr: "DN15-DN3000 toutes tailles", ar: "DN15-DN3000 جميع المقاسات" },
      description: { zh: "从常规工况到高温高压、强腐蚀特殊工况，VALTRIX提供完整的阀门选型、定制与成套供应服务，满足严苛工业需求。", en: "From standard conditions to high temperature, high pressure and corrosive applications, VALTRIX provides complete valve selection, customization and package supply.", ja: "通常環境から高温・高圧・強腐食性の特殊環境まで、バルブテックはバルブ選定、カスタマイズ、一括供給のサービスを提供します。", ko: "일반 조건부터 고온, 고압, 강부식 특수 조건까지 밸브텍는 완벽한 밸브 선정, 맞춤 제작, 일괄 공급 서비스를 제공합니다.", fr: "Des conditions standard aux applications à haute température, haute pression et corrosives, VALTRIX fournit sélection, personnalisation et approvisionnement complet.", ar: "من الظروف القياسية إلى درجات الحرارة العالية والضغط العالي والتطبيقات المسببة للتآكل، توفر فالف تك خدمات اختيار وتخصيص وتوريد كاملة." },
      ctaText: { zh: "了解实力", en: "Learn More", ja: "実力を知る", ko: "실력 알아보기", fr: "En savoir plus", ar: "اعرف المزيد" },
      ctaLink: "/about",
      bgGradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
      sortOrder: 2,
    },
    {
      id: "banner-3", title: { zh: "全球服务网络", en: "Global Service Network", ja: "グローバルサービスネットワーク", ko: "글로벌 서비스 네트워크", fr: "Réseau de services mondial", ar: "شبكة خدمات عالمية" },
      subtitle: { zh: "快速响应 全程保障", en: "Quick Response, Full Support", ja: "迅速対応・フルサポート", ko: "빠른 대응, 전방위 지원", fr: "Réponse rapide, support complet", ar: "استجابة سريعة، دعم كامل" },
      description: { zh: "产品远销欧美、东南亚、中东等 30 多个国家和地区，提供本地化技术支持与快速售后响应。", en: "Products exported to 30+ countries across Europe, America, Southeast Asia and the Middle East, with localized technical support and rapid after-sales response.", ja: "製品は欧米、東南アジア、中東など30以上の国と地域に輸出され、現地化された技術サポートと迅速なアフターサービスを提供します。", ko: "제품은 유럽, 미주, 동남아, 중동 등 30여 개국에 수출되며 현지화된 기술 지원과 신속한 애프터서비스를 제공합니다.", fr: "Produits exportés dans plus de 30 pays en Europe, Amérique, Asie du Sud-Est et Moyen-Orient, avec support technique localisé et réponse après-vente rapide.", ar: "تصدر المنتجات إلى أكثر من 30 دولة في أوروبا وأمريكا وجنوب شرق آسيا والشرق الأوسط، مع دعم فني محلي واستجابة سريعة." },
      ctaText: { zh: "联系我们", en: "Contact Us", ja: "お問い合わせ", ko: "문의하기", fr: "Contactez-nous", ar: "اتصل بنا" },
      ctaLink: "/contact",
      bgGradient: "from-[#2d3436] via-[#636e72] to-[#2d3436]",
      sortOrder: 3,
    },
  ],
  features: [
    { id: "f1", icon: "award", title: { zh: "ISO9001 认证", en: "ISO9001 Certified", ja: "ISO9001認証", ko: "ISO9001 인증", fr: "Certifié ISO9001", ar: "شهادة ISO9001" }, description: { zh: "通过ISO9001质量管理体系认证，全流程品质管控", en: "ISO9001 quality management system certified with full process quality control", ja: "ISO9001品質マネジメントシステム認証、全工程品質管理", ko: "ISO9001 품질경영시스템 인증, 전 공정 품질 관리", fr: "Système de gestion de la qualité certifié ISO9001", ar: "نظام إدارة جودة معتمد ISO9001" } },
    { id: "f2", icon: "shield", title: { zh: "耐压气密双检", en: "Pressure & Leakage Tested", ja: "耐圧・気密二重検査", ko: "내압·기밀 이중 검사", fr: "Tests de pression et d'étanchéité", ar: "اختبارات الضغط والتسرب" }, description: { zh: "每台阀门出厂前均经过壳体耐压与密封性能双重检测", en: "Every valve passes shell pressure and sealing performance tests before shipment", ja: "全バルブ出荷前にケーシング耐圧・シール性能の二重検査を実施", ko: "모든 밸브는 출하 전 셸 내압 및 실링 성능 이중 검사를 거칩니다", fr: "Chaque vanne subit des tests de pression et d'étanchéité avant expédition", ar: "يخضع كل صمام لاختبارات الضغط والتسرب قبل الشحن" } },
    { id: "f3", icon: "zap", title: { zh: "快速交付", en: "Fast Delivery", ja: "短納期", ko: "빠른 납기", fr: "Livraison rapide", ar: "تسليم سريع" }, description: { zh: "常备库存充足，标准品 3-7 天交付，定制品 20-30 天", en: "Adequate stock, 3-7 days for standard products, 20-30 days for customized", ja: "常備在庫充実、標準品3-7日・カスタム品20-30日で納品", ko: "상시 재고 충분, 표준품 3-7일, 맞춤품 20-30일 납기", fr: "Stock suffisant, 3-7 jours pour les standards, 20-30 jours pour les sur-mesure", ar: "مخزون كافٍ، 3-7 أيام للمنتجات القياسية، 20-30 يومًا للمخصصة" } },
    { id: "f4", icon: "globe", title: { zh: "出口 30+ 国", en: "Export to 30+ Countries", ja: "30以上の国へ輸出", ko: "30여 개국 수출", fr: "Exporté dans 30+ pays", ar: "تصدير لأكثر من 30 دولة" }, description: { zh: "符合API、CE、ISO等国际标准，全球工业项目验证", en: "Compliant with API, CE, ISO international standards, proven in global projects", ja: "API・CE・ISO等の国際規格に適合、世界中のプロジェクトで実績", ko: "API, CE, ISO 국제 규격 준수, 글로벌 프로젝트 검증", fr: "Conforme aux normes API, CE, ISO, éprouvé dans des projets mondiaux", ar: "متوافق مع المعايير الدولية API وCE وISO" } },
  ],
  stats: [
    { id: "stat-1", label: { zh: "产品系列", en: "Product Series", ja: "製品シリーズ", ko: "제품 시리즈", fr: "Séries de produits", ar: "سلاسل المنتجات" }, value: "6", number: "6" },
    { id: "stat-2", label: { zh: "服务行业", en: "Industries Served", ja: "対応業界", ko: "서비스 산업", fr: "Secteurs desservis", ar: "القطاعات المخدومة" }, value: "20+", number: "20+" },
    { id: "stat-3", label: { zh: "年产量", en: "Annual Output", ja: "年間生産量", ko: "연간 생산량", fr: "Production annuelle", ar: "الإنتاج السنوي" }, value: "50000", number: "50000" },
    { id: "stat-4", label: { zh: "全球客户", en: "Global Customers", ja: "世界の顧客", ko: "글로벌 고객", fr: "Clients mondiaux", ar: "العملاء العالميون" }, value: "3000+", number: "3000+" },
  ],
  featuredProducts: [],
  featuredCategories: ["gate-valve", "ball-valve", "butterfly-valve"],
  showNews: true, showIndustries: true, showServices: true,
  ctaTitle: "需要专业的阀门解决方案？",
  ctaSubtitle: "我们的工程师将为您提供一对一的阀门选型与技术咨询",
  ctaButtonText: "立即咨询",
  ctaButtonLink: "/contact",
};

const SEO_CONFIG = {
  siteName: "VALTRIX",
  siteNameEn: "VALTRIX",
  defaultTitle: "VALTRIX - 工业阀门解决方案专家",
  defaultDesc: "VALTRIX专注工业阀门研发制造20年，提供闸阀、球阀、蝶阀、止回阀、安全阀、调节阀等全系列产品，应用于石油化工、水处理、天然气、电力等领域。",
  keywords: "阀门,闸阀,球阀,蝶阀,止回阀,安全阀,调节阀,工业阀门,VALTRIX",
  companyName: "VALTRIX Co., Ltd.",
  // 占位地址/电话/地区已清除，请由后台「SEO 优化」填写真实值；留空时 JSON-LD 自动回退「站点设置 → 联系方式」
  companyAddress: "",
  phone: "",
  email: "sales@valtrix.com",
  geoRegion: "",
};

async function main() {
  console.log("== 1. 语言 ==");
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({ where: { code: lang.code }, update: { isActive: true, sortOrder: lang.sortOrder }, create: lang });
  }
  console.log("语言 6 条完成");

  console.log("== 2. 产品 Tab（upsert 阀门，保留现有引用）==");
  const tabs = {};
  for (const t of TABS) {
    const existing = await prisma.productTab.findUnique({ where: { slug: t.slug } });
    let created;
    if (existing) {
      created = await prisma.productTab.update({ where: { id: existing.id }, data: { name: t.name, nameEn: t.nameEn, sortOrder: t.sortOrder } });
    } else {
      created = await prisma.productTab.create({ data: { slug: t.slug, name: t.name, nameEn: t.nameEn, sortOrder: t.sortOrder } });
    }
    tabs[t.slug] = created.id;
  }
  console.log("tabs 完成:", TABS.length);

  console.log("== 3. 默认模板 ==");
  await prisma.template.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "默认模板", slug: "default", version: "v1.0.0", description: "VALTRIX默认前端模板（六语种全模块）", isDefault: true, isActive: true, sortOrder: 0 },
  });
  console.log("模板完成");

  console.log("== 4. 菜单 ==");
  await prisma.menu.deleteMany({});
  for (const m of MENUS) {
    const parent = await prisma.menu.create({ data: { name: m.name, nameEn: m.nameEn, url: m.url, sortOrder: m.sort, isActive: true } });
    if (m.children) {
      for (const c of m.children) {
        await prisma.menu.create({ data: { name: c.name, nameEn: c.nameEn, url: c.url, sortOrder: c.sort, parentId: parent.id, isActive: true } });
      }
    }
  }
  console.log("菜单完成:", MENUS.length);

  console.log("== 5. 站点配置 ==");
  for (const sc of SITE_CONFIGS) {
    await prisma.siteConfig.upsert({ where: { configKey: sc.code }, update: { configValue: sc.configValue }, create: { configKey: sc.code, configValue: sc.configValue } });
  }
  console.log("site_config 完成:", SITE_CONFIGS.length);

  console.log("== 6. 首页配置 ==");
  const existingHome = await prisma.homeConfig.findFirst({});
  if (existingHome) {
    await prisma.homeConfig.update({ where: { id: existingHome.id }, data: HOME_CONFIG });
  } else {
    await prisma.homeConfig.create({ data: HOME_CONFIG });
  }
  console.log("home_config 完成");

  console.log("== 7. SEO 配置 ==");
  const existingSeo = await prisma.sEOConfig.findFirst({});
  if (existingSeo) {
    await prisma.sEOConfig.update({ where: { id: existingSeo.id }, data: SEO_CONFIG });
  } else {
    await prisma.sEOConfig.create({ data: SEO_CONFIG });
  }
  console.log("seo_config 完成");
  console.log("\n✅ 基础种子全部完成");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
