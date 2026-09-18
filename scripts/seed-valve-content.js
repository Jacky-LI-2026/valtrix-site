// VALTRIX内容种子：产品/商城/行业/新闻/服务/资源/关于（示例数据，zh+en，幂等可重跑）
const { PrismaClient } = require("../lib/generated/prisma");
const prisma = new PrismaClient();

const IMG_GATE = "/placeholders/industry-machining.webp";
const IMG_BALL = "/placeholders/industry-energy.webp";
const IMG_BUTTERFLY = "/placeholders/industry-default.webp";
const IMG_CHECK = "/placeholders/industry-semiconductor.webp";
const IMG_SAFETY = "/placeholders/industry-optics.webp";
const IMG_REG = "/placeholders/industry-quantum.webp";

async function main() {
  // ---------- 新闻分类 ----------
  const nc = [
    { name: "公司动态", nameEn: "Company News", slug: "company" },
    { name: "产品发布", nameEn: "Product Launch", slug: "product" },
    { name: "行业资讯", nameEn: "Industry Insights", slug: "industry" },
  ];
  for (const c of nc) {
    await prisma.newsCategory.upsert({
      where: { slug: c.slug }, update: c, create: c,
    });
  }
  const catCompany = await prisma.newsCategory.findUnique({ where: { slug: "company" } });
  const catProduct = await prisma.newsCategory.findUnique({ where: { slug: "product" } });
  const catIndustry = await prisma.newsCategory.findUnique({ where: { slug: "industry" } });

  // ---------- 新闻 ----------
  const news = [
    {
      categoryId: catCompany.id, slug: "haogu-valve-opens-new-plant", title: "VALTRIX新制造基地正式投产", titleEn: "VALTRIX New Manufacturing Base Officially Operational",
      summary: "VALTRIX位于温州永嘉的新制造基地正式投产，年产能提升至 50 万台，覆盖闸阀、球阀、蝶阀等全系列产品。", summaryEn: "VALTRIX's new manufacturing base in Yongjia, Wenzhou is now operational, lifting annual capacity to 500,000 units covering the full valve range.",
      content: "<p>VALTRIX新制造基地于 2026 年 9 月正式投产，总投资 1.2 亿元，建筑面积 3 万平方米。新基地配备数控加工中心、自动化装配线和氦质谱检漏设备，实现从阀体铸造、机加工到装配检测的全流程数字化管理。</p><p>投产后公司年产能由 20 万台提升至 50 万台，可更好满足石油化工、水处理、天然气等行业的阀门配套需求。</p>", contentEn: "<p>VALTRIX's new manufacturing base officially started production in September 2026 with a total investment of RMB 120 million and 30,000 m² of floor area. The base is equipped with CNC machining centers, automated assembly lines and helium mass spectrometer leak testing equipment, realizing full-process digital management from casting and machining to assembly and testing.</p><p>Annual capacity has increased from 200,000 to 500,000 units, better serving valve package needs of petrochemical, water treatment and natural gas industries.</p>",
      coverImage: IMG_GATE, author: "VALTRIX", status: "published", publishedAt: new Date("2026-09-01T08:00:00Z"), isFeatured: true, isTop: true,
      seoTitle: "VALTRIX新制造基地正式投产", seoTitleEn: "VALTRIX New Manufacturing Base Operational",
    },
    {
      categoryId: catProduct.id, slug: "ball-valve-3pc-release", title: "新品发布：三片式法兰球阀系列", titleEn: "New Release: 3-Piece Flanged Ball Valve Series",
      summary: "全新三片式法兰球阀系列正式发布，覆盖 DN15-DN300，采用防火防静电结构，满足 API 6D 标准。", summaryEn: "New 3-piece flanged ball valve series released, covering DN15-DN300 with fire-safe anti-static design per API 6D.",
      content: "<p>VALTRIX正式发布三片式法兰球阀系列，产品覆盖 DN15-DN300 全系列规格，公称压力 PN16-PN40。</p><p>该系列采用防火防静电结构设计，阀座为 PTFE/RPTFE 材质，阀杆带防吹出保护，完全满足 API 6D 与 ISO 10497 防火试验要求，适用于石油、天然气、化工等行业的严苛工况。</p>", contentEn: "<p>VALTRIX officially released its 3-piece flanged ball valve series, covering DN15-DN300 with pressure ratings PN16-PN40.</p><p>The series features fire-safe anti-static design, PTFE/RPTFE seats and blow-out-proof stems, fully compliant with API 6D and ISO 10497 fire tests for demanding oil, gas and chemical services.</p>",
      coverImage: IMG_BALL, author: "VALTRIX", status: "published", publishedAt: new Date("2026-08-20T08:00:00Z"), isFeatured: true,
      seoTitle: "三片式法兰球阀系列新品发布", seoTitleEn: "3-Piece Flanged Ball Valve Series Launch",
    },
    {
      categoryId: catIndustry.id, slug: "hydrogen-valve-trend-2026", title: "氢能产业加速，氢气阀门需求快速增长", titleEn: "Hydrogen Industry Accelerates, Driving Hydrogen Valve Demand",
      summary: "随着氢能产业政策持续加码，氢气阀门、管阀件需求快速增长，对密封性与安全性的要求进一步提升。", summaryEn: "As hydrogen policies strengthen, demand for hydrogen valves and tube fittings grows rapidly with higher sealing and safety requirements.",
      content: "<p>2026 年氢能产业进入加速期，加氢站、制氢装置与燃料电池系统的阀门需求快速增长。氢气分子小、易泄漏，对阀门密封性和材料兼容性提出更高要求。</p><p>VALTRIX已推出氢气专用阀门与卡套管阀件系列，阀体采用 316L 不锈钢，密封件选用氢兼容材料，并可通过氦检漏认证，助力氢能产业链客户安全运营。</p>", contentEn: "<p>The hydrogen industry entered an acceleration phase in 2026, with fast-growing valve demand from hydrogen refueling stations, production plants and fuel cell systems. Hydrogen's small molecules and leak-proneness demand superior sealing and material compatibility.</p><p>VALTRIX has launched hydrogen-dedicated valves and tube fitting series with 316L stainless steel bodies and hydrogen-compatible seals, certified by helium leak testing to support safe hydrogen operations.</p>",
      coverImage: IMG_CHECK, author: "VALTRIX", status: "published", publishedAt: new Date("2026-08-10T08:00:00Z"),
      seoTitle: "氢能产业加速带动氢气阀门需求", seoTitleEn: "Hydrogen Industry Drives Valve Demand",
    },
    {
      categoryId: catCompany.id, slug: "iso9001-certified", title: "VALTRIX通过 ISO 9001 质量管理体系认证", titleEn: "VALTRIX Passes ISO 9001 Certification",
      summary: "公司顺利通过 ISO 9001:2015 质量管理体系认证审核，质量管理水平获得权威认可。", summaryEn: "The company passed ISO 9001:2015 certification audit, with quality management recognized by authorities.",
      content: "<p>VALTRIX顺利通过 ISO 9001:2015 质量管理体系认证审核。审核覆盖产品设计、采购、生产、检验与售后服务全过程。</p><p>公司将持续完善质量管理体系，严格执行来料检验、过程检验与成品检验三级质量把关，确保出厂阀门 100% 合格。</p>", contentEn: "<p>VALTRIX successfully passed the ISO 9001:2015 quality management system certification audit, covering the full process of design, procurement, production, inspection and after-sales service.</p><p>The company will continue improving its quality system with three-level inspection of incoming materials, in-process and finished products to guarantee 100% conformity.</p>",
      coverImage: IMG_SAFETY, author: "VALTRIX", status: "published", publishedAt: new Date("2026-07-15T08:00:00Z"),
      seoTitle: "VALTRIX通过ISO 9001认证", seoTitleEn: "VALTRIX Passes ISO 9001",
    },
  ];
  for (const n of news) {
    const { categoryId, ...rest } = n;
    const existing = await prisma.news.findUnique({ where: { slug: rest.slug } });
    if (existing) { await prisma.news.update({ where: { slug: rest.slug }, data: rest }); }
    else { await prisma.news.create({ data: rest }); }
  }

  // ---------- 行业 ----------
  const industries = [
    {
      slug: "petrochemical", name: "石油化工", nameEn: "Petrochemical",
      tagline: "严苛工况下的可靠流体控制", taglineEn: "Reliable fluid control in demanding services",
      description: "石油化工行业对阀门的气密性、耐腐蚀与耐高温性能要求极高。VALTRIX提供全系列闸阀、球阀、安全阀与调节阀，采用 WCB/CF8M 阀体与硬质合金密封面，满足 API 598 泄漏等级要求，保障炼化装置长期稳定运行。",
      descriptionEn: "The petrochemical industry demands high gas-tightness, corrosion and temperature resistance from valves. VALTRIX supplies full series of gate, ball, safety and regulating valves with WCB/CF8M bodies and hard-faced seats, meeting API 598 leakage classes for reliable refinery operation.",
      challenges: ["高温高压及腐蚀性介质工况严苛", "阀门内漏导致装置能耗升高", "装置检修周期要求长寿命阀门", "安全阀整定精度与排放可靠性要求高"],
      challengesEn: ["Severe high-temperature, high-pressure and corrosive services", "Internal leakage raises plant energy consumption", "Long maintenance intervals demand long-life valves", "Safety valves require precise set points and reliable discharge"],
      solutions: [
        { title: "全流程阀门选型方案", desc: "覆盖原料、反应、分离、储存全流程的闸阀、球阀、止回阀与安全阀配套", titleEn: "Full-process valve selection", descEn: "Gate, ball, check and safety valves for feed, reaction, separation and storage services" },
        { title: "高温高压阀内件优化", desc: "硬质合金堆焊密封面与高温填料，延长阀门在苛刻工况下的使用寿命", titleEn: "High-temp trim optimization", descEn: "Stellite hard-facing and high-temperature packing extend service life" },
      ],
      products: ["闸阀系列", "球阀系列", "安全阀系列", "调节阀系列"], productsEn: ["Gate Valves", "Ball Valves", "Safety Valves", "Regulating Valves"],
      cases: [
        { title: "炼化装置阀门成套供应", desc: "为某炼化企业常减压装置提供 200+ 台成套阀门，一次开车成功", titleEn: "Refinery valve package", descEn: "Supplied 200+ valves for an atmospheric-vacuum unit with successful start-up" },
      ],
    },
    {
      slug: "water-treatment", name: "水处理", nameEn: "Water Treatment",
      tagline: "市政与工业水系统的高效阀门", taglineEn: "Efficient valves for municipal and industrial water systems",
      description: "水处理行业覆盖市政供水、污水处理与中水回用，阀门数量大、启闭频繁。VALTRIX提供对夹蝶阀、软密封闸阀等经济可靠的解决方案，EPDM/NBR 密封适应长期浸水工况，支持电动/气动自动化控制。",
      descriptionEn: "Water treatment covers municipal supply, sewage treatment and water reuse with frequent valve operation. VALTRIX offers economical wafer butterfly and resilient-seated gate valves with EPDM/NBR seats for long-term immersion, supporting electric/pneumatic automation.",
      challenges: ["阀门数量庞大，维护成本高", "频繁启闭要求耐磨耐用", "污水介质含固体颗粒易磨损密封面", "自动化改造需要可靠的执行器配套"],
      challengesEn: ["Large valve count drives maintenance cost", "Frequent operation demands durability", "Sewage solids wear sealing surfaces", "Automation needs reliable actuator support"],
      solutions: [
        { title: "水厂阀门整体配套", desc: "对夹蝶阀、软密封闸阀、止回阀一站式配套，支持法兰/对夹/卡箍连接", titleEn: "Water plant valve package", descEn: "One-stop wafer butterfly, resilient gate and check valves with multiple connections" },
      ],
      products: ["蝶阀系列", "闸阀系列", "止回阀系列"], productsEn: ["Butterfly Valves", "Gate Valves", "Check Valves"],
      cases: [
        { title: "市政污水处理厂阀门改造", desc: "为某 10 万吨/日污水处理厂更换 300+ 台蝶阀，能耗降低 12%", titleEn: "Municipal WWTP valve retrofit", descEn: "Replaced 300+ butterfly valves for a 100k m³/d plant, cutting energy use by 12%" },
      ],
    },
    {
      slug: "natural-gas", name: "天然气", nameEn: "Natural Gas",
      tagline: "燃气输配系统的安全阀门", taglineEn: "Safe valves for gas transmission and distribution",
      description: "天然气输配对阀门的密封性与防静电防火性能有强制要求。VALTRIX提供符合 API 6D 的球阀、闸阀与安全阀，全通径设计配合防静电防火结构，适用于长输管线、城市燃气与 LNG 站场。",
      descriptionEn: "Gas transmission demands mandatory sealing, anti-static and fire-safe valve features. VALTRIX supplies API 6D ball, gate and safety valves with full bore and anti-static fire-safe designs for pipelines, city gas and LNG terminals.",
      challenges: ["气体介质易泄漏，密封要求苛刻", "防静电防火结构为强制要求", "管线压力波动大，冲击载荷高", "阀门外输与维修需带压作业支持"],
      challengesEn: ["Gas media leak easily, strict sealing required", "Anti-static and fire-safe structure mandatory", "Pipeline pressure surges create impact loads", "Online maintenance support needed"],
      solutions: [
        { title: "输配管网阀门成套", desc: "全通径球阀、埋地闸阀与安全阀配套，符合 API 6D / ISO 10497 防火标准", titleEn: "Gas network valve package", descEn: "Full bore ball, buried gate and safety valves per API 6D / ISO 10497 fire-safe standards" },
      ],
      products: ["球阀系列", "闸阀系列", "安全阀系列"], productsEn: ["Ball Valves", "Gate Valves", "Safety Valves"],
      cases: [
        { title: "城市燃气调压站改造", desc: "为某燃气集团 15 座调压站更换球阀与安全阀，泄漏率降至零", titleEn: "City gas station upgrade", descEn: "Replaced valves for 15 pressure-regulating stations with zero leakage achieved" },
      ],
    },
    {
      slug: "power", name: "电力", nameEn: "Power Generation",
      tagline: "高温高压电站阀门的可靠之选", taglineEn: "Reliable valves for high-pressure power plants",
      description: "火电、热电与核电领域需要耐高温高压的阀门产品。VALTRIX提供电站专用闸阀、止回阀与安全阀，阀体采用耐热合金钢，适用于主蒸汽、给水及疏水系统，保障机组安全经济运行。",
      descriptionEn: "Thermal and nuclear power need high-temperature, high-pressure valves. VALTRIX offers power-plant gate, check and safety valves in heat-resistant alloy steel for main steam, feedwater and drain systems.",
      challenges: ["主蒸汽系统高温高压（可达 540℃/10MPa）", "启停机热冲击频繁", "阀内件需耐冲蚀耐汽蚀", "安全阀可靠性直接关系机组安全"],
      challengesEn: ["Main steam up to 540℃/10MPa", "Frequent thermal cycling on start/stop", "Trim needs erosion and cavitation resistance", "Safety valve reliability is safety-critical"],
      solutions: [
        { title: "电站阀门成套供应", desc: "主蒸汽、给水、疏水系统闸阀/止回阀/安全阀按 ASME B16.34 配套", titleEn: "Power plant valve supply", descEn: "Gate, check and safety valves per ASME B16.34" },
      ],
      products: ["闸阀系列", "止回阀系列", "安全阀系列"], productsEn: ["Gate Valves", "Check Valves", "Safety Valves"],
      cases: [
        { title: "热电联产机组阀门检修", desc: "为某 2×300MW 热电项目提供主蒸汽阀门检修与备件，一次并网成功", titleEn: "CHP unit valve overhaul", descEn: "Main steam valve overhaul and spares for a 2×300MW CHP project" },
      ],
    },
    {
      slug: "metallurgy-mining", name: "冶金矿业", nameEn: "Metallurgy & Mining",
      tagline: "耐磨耐蚀，应对矿浆与高温工况", taglineEn: "Abrasion and corrosion resistant for slurry and high-temperature services",
      description: "冶金矿业面临矿浆磨损、高温熔体与腐蚀介质等苛刻工况。VALTRIX提供耐磨蝶阀、陶瓷衬里球阀与调节阀，适应高含固量介质，显著降低停机维护频率。",
      descriptionEn: "Mining and metallurgy face slurry abrasion, high-temperature melts and corrosive media. VALTRIX supplies wear-resistant butterfly, ceramic-lined ball and regulating valves for high-solids media with fewer outages.",
      challenges: ["矿浆高含固量严重磨损密封面", "高温熔体与腐蚀性介质并存", "阀门更换困难，停机损失大", "耐磨材质选择专业性强"],
      challengesEn: ["High-solids slurry wears seats severely", "High-temperature melts and corrosive media coexist", "Valve replacement is difficult and costly", "Wear-resistant material selection is specialized"],
      solutions: [
        { title: "耐磨阀门成套方案", desc: "陶瓷衬里球阀、耐磨蝶阀与矿浆专用调节阀，延长使用寿命 2-3 倍", titleEn: "Wear-resistant valve package", descEn: "Ceramic-lined ball, wear butterfly and slurry valves extend life 2-3x" },
      ],
      products: ["蝶阀系列", "球阀系列", "调节阀系列"], productsEn: ["Butterfly Valves", "Ball Valves", "Regulating Valves"],
      cases: [
        { title: "选矿厂矿浆阀门改造", desc: "为某选矿厂更换陶瓷球阀 120 台，阀门寿命由 3 个月提升至 9 个月", titleEn: "Concentrator slurry valve upgrade", descEn: "Replaced 120 ceramic ball valves, life extended from 3 to 9 months" },
      ],
    },
    {
      slug: "marine-offshore", name: "船舶海工", nameEn: "Marine & Offshore",
      tagline: "通过船级社认证的船用阀门", taglineEn: "Class-approved marine valves",
      description: "船舶与海洋工程对阀门的耐海水腐蚀、抗振动性能有严格认证要求。VALTRIX提供通过 CCS/ABS/DNV 船级社认证的船用阀门，适用于压载水、消防、燃油及冷却系统。",
      descriptionEn: "Marine and offshore applications require saltwater corrosion resistance and vibration tolerance with class certification. VALTRIX supplies CCS/ABS/DNV approved valves for ballast, fire-fighting, fuel and cooling systems.",
      challenges: ["海水腐蚀性强，阀体需耐蚀材质", "船级社认证门槛高", "船上空间紧凑，阀门需紧凑轻量", "振动工况对阀门连接可靠性要求高"],
      challengesEn: ["Seawater is highly corrosive, requiring corrosion-resistant bodies", "Class certification is demanding", "Compact shipboard spaces need compact valves", "Vibration requires reliable connections"],
      solutions: [
        { title: "船用阀门认证供应", desc: "船用闸阀、截止阀、止回阀与蝶阀，提供 CCS/ABS/DNV 船检证书", titleEn: "Class-approved marine valves", descEn: "Marine valves with CCS/ABS/DNV certificates" },
      ],
      products: ["闸阀系列", "蝶阀系列", "止回阀系列"], productsEn: ["Gate Valves", "Butterfly Valves", "Check Valves"],
      cases: [
        { title: "远洋船舶阀门配套", desc: "为某船厂 8 艘散货船提供 600+ 台船用阀门，全部通过船检", titleEn: "Ocean vessel valve supply", descEn: "Supplied 600+ marine valves for 8 bulk carriers, all class-approved" },
      ],
    },
  ];
  for (const ind of industries) {
    const existing = await prisma.industry.findUnique({ where: { slug: ind.slug } });
    if (existing) { await prisma.industry.update({ where: { slug: ind.slug }, data: ind }); }
    else { await prisma.industry.create({ data: ind }); }
  }

  // ---------- 产品分类与产品 ----------
  const tabs = await prisma.productTab.findMany({ orderBy: { id: "asc" } });
  const tabBySlug = Object.fromEntries(tabs.map((t) => [t.slug, t.id]));
  const cats = [
    { tabSlug: "gate-valve", slug: "gate-standard", name: "标准闸阀", nameEn: "Standard Gate Valves", sortOrder: 0 },
    { tabSlug: "ball-valve", slug: "ball-floating", name: "浮动球阀", nameEn: "Floating Ball Valves", sortOrder: 0 },
    { tabSlug: "butterfly-valve", slug: "butterfly-wafer", name: "对夹式蝶阀", nameEn: "Wafer Butterfly Valves", sortOrder: 0 },
    { tabSlug: "check-valve", slug: "check-swing", name: "旋启式止回阀", nameEn: "Swing Check Valves", sortOrder: 0 },
    { tabSlug: "safety-valve", slug: "safety-spring", name: "弹簧式安全阀", nameEn: "Spring Safety Valves", sortOrder: 0 },
    { tabSlug: "regulating-valve", slug: "regulating-globe", name: "套筒调节阀", nameEn: "Cage Regulating Valves", sortOrder: 0 },
  ];
  for (const c of cats) {
    const data = { tabId: tabBySlug[c.tabSlug], ...c, tabSlug: undefined };
    delete data.tabSlug;
    const existing = await prisma.productCategory.findUnique({ where: { tabId_slug: { tabId: tabBySlug[c.tabSlug], slug: c.slug } } });
    if (existing) { await prisma.productCategory.update({ where: { id: existing.id }, data }); }
    else { await prisma.productCategory.create({ data }); }
  }
  const catBySlug = {};
  for (const c of cats) {
    catBySlug[c.slug] = await prisma.productCategory.findUnique({ where: { tabId_slug: { tabId: tabBySlug[c.tabSlug], slug: c.slug } } });
  }

  const products = [
    {
      tabSlug: "gate-valve", categorySlug: "gate-standard", slug: "gate-dn50", model: "HG-Z41H-16C DN50",
      name: "铸钢法兰闸阀", nameEn: "Cast Steel Flanged Gate Valve", subtitle: "明杆弹性闸板，耐压 1.6MPa", subtitleEn: "Rising stem flexible wedge, PN1.6MPa",
      summary: "WCB 碳钢阀体，明杆弹性闸板，适用于水、油、气介质，广泛用于石油、化工、水处理管道。", summaryEn: "WCB carbon steel body, rising stem flexible wedge for water, oil and gas in oil, chemical and water pipelines.",
      description: "<p>铸钢法兰闸阀采用 WCB 碳钢阀体，明杆带启闭指示，弹性闸板密封可靠，全通径低流阻设计。</p><p>密封面堆焊硬质合金，使用寿命长，适用于石油、化工、水处理等管道介质截断工况。</p>",
      descriptionEn: "<p>Cast steel flanged gate valve with WCB body, rising stem with indicator and reliable flexible wedge sealing, full bore low resistance design.</p><p>Hard-faced seat extends service life for media isolation in oil, chemical and water pipelines.</p>",
      features: ["明杆带启闭指示", "弹性闸板密封可靠", "全通径低流阻"], featuresEn: ["Rising stem with indicator", "Reliable flexible wedge", "Full bore low resistance"],
      coverImage: IMG_GATE, images: [{ url: IMG_GATE, alt: "铸钢法兰闸阀" }], price: 680
    },
    {
      tabSlug: "gate-valve", categorySlug: "gate-standard", slug: "gate-ss", model: "HG-Z45X-16P DN80",
      name: "不锈钢暗杆闸阀", nameEn: "SS Non-rising Stem Gate Valve", subtitle: "全不锈钢耐腐蚀", subtitleEn: "Full stainless steel anti-corrosion",
      summary: "304/316 不锈钢阀体，暗杆结构节省安装空间，适用于腐蚀性介质。", summaryEn: "304/316 SS body, compact non-rising stem for corrosive media.",
      description: "<p>不锈钢暗杆闸阀采用 304/316 不锈钢阀体，暗杆结构紧凑节省安装空间，软密封零泄漏。</p><p>适用于弱腐蚀性介质及食品、医药等行业管道系统。</p>",
      descriptionEn: "<p>SS non-rising stem gate valve with 304/316 body, compact design and soft-seated zero leakage.</p><p>For mildly corrosive media and food, pharmaceutical piping systems.</p>",
      features: ["全不锈钢耐腐蚀", "暗杆结构紧凑", "软密封零泄漏"], featuresEn: ["Full SS anti-corrosion", "Compact design", "Soft-seated zero leakage"],
      coverImage: IMG_GATE, images: [{ url: IMG_GATE, alt: "不锈钢暗杆闸阀" }], price: 520
    },
    {
      tabSlug: "ball-valve", categorySlug: "ball-floating", slug: "ball-2pc", model: "HG-Q11F-16P DN25",
      name: "两片式内螺纹球阀", nameEn: "2-Piece Threaded Ball Valve", subtitle: "PTFE 密封，90° 快速启闭", subtitleEn: "PTFE seats, quick 90° operation",
      summary: "304 不锈钢两片式球阀，PTFE 密封，适用于水、油、气及弱腐蚀介质。", summaryEn: "304 SS 2-piece ball valve with PTFE seats for water, oil, gas and mild corrosive media.",
      description: "<p>两片式内螺纹球阀采用 304 不锈钢阀体，结构紧凑轻便，90° 启闭迅速，PTFE 密封防泄漏。</p><p>广泛用于水处理、暖通空调、工业管路系统。</p>",
      descriptionEn: "<p>2-piece threaded ball valve with 304 SS body, compact and light, quick 90° on/off with PTFE sealing.</p><p>Widely used in water, HVAC and industrial piping systems.</p>",
      features: ["结构紧凑轻便", "开关迅速 90° 启闭", "PTFE 密封防泄漏"], featuresEn: ["Compact and light", "Quick 90° on/off", "PTFE sealing leak-proof"],
      coverImage: IMG_BALL, images: [{ url: IMG_BALL, alt: "两片式内螺纹球阀" }], price: 128
    },
    {
      tabSlug: "ball-valve", categorySlug: "ball-floating", slug: "ball-3pc", model: "HG-Q41F-16C DN100",
      name: "三片式法兰球阀", nameEn: "3-Piece Flanged Ball Valve", subtitle: "防火防静电，易维护", subtitleEn: "Fire-safe anti-static, easy maintenance",
      summary: "WCB 阀体三片式法兰球阀，易维护易更换阀座，适用于工业管道系统。", summaryEn: "WCB 3-piece flanged ball valve, easy maintenance and seat replacement for industrial piping.",
      description: "<p>三片式法兰球阀采用三片式结构，无需拆卸管道即可更换阀座，维护便捷。</p><p>防火防静电设计，全通径低流阻，符合 API 6D 标准，适用于石油、天然气、化工等行业。</p>",
      descriptionEn: "<p>3-piece flanged ball valve with easy seat replacement without removing the valve from pipeline.</p><p>Fire-safe anti-static design, full bore, compliant with API 6D for oil, gas and chemical industries.</p>",
      features: ["三片式易维护", "防火防静电设计", "全通径低流阻"], featuresEn: ["3-piece easy maintenance", "Fire-safe anti-static", "Full bore low resistance"],
      coverImage: IMG_BALL, images: [{ url: IMG_BALL, alt: "三片式法兰球阀" }], price: 1850
    },
    {
      tabSlug: "butterfly-valve", categorySlug: "butterfly-wafer", slug: "butterfly-dn200", model: "HG-D71X-16 DN200",
      name: "对夹式软密封蝶阀", nameEn: "Wafer Soft-Seated Butterfly Valve", subtitle: "轻巧高效，启闭迅速", subtitleEn: "Light, efficient, quick operation",
      summary: "球墨铸铁阀体，EPDM 软密封，适用于水、污水及中性介质。", summaryEn: "Ductile iron body, EPDM soft seat for water, sewage and neutral media.",
      description: "<p>对夹式软密封蝶阀体积小、重量轻，启闭迅速，密封性能优良。</p><p>EPDM 密封适应长期浸水工况，适用于水处理、暖通空调、电力行业。</p>",
      descriptionEn: "<p>Wafer butterfly valve is compact and light with quick operation and excellent sealing.</p><p>EPDM seat suits long-term immersion for water, HVAC and power industries.</p>",
      features: ["体积小重量轻", "启闭迅速", "密封性能优良"], featuresEn: ["Compact and light", "Quick operation", "Excellent sealing"],
      coverImage: IMG_BUTTERFLY, images: [{ url: IMG_BUTTERFLY, alt: "对夹式软密封蝶阀" }], price: 960
    },
    {
      tabSlug: "check-valve", categorySlug: "check-swing", slug: "check-dn100", model: "HG-H44H-16C DN100",
      name: "法兰旋启式止回阀", nameEn: "Flanged Swing Check Valve", subtitle: "自动防倒流，低流阻", subtitleEn: "Automatic backflow prevention",
      summary: "WCB 阀体，旋启式结构，低流阻防倒流，适用于水、油、蒸汽。", summaryEn: "WCB body, swing type, low resistance anti-backflow for water, oil and steam.",
      description: "<p>旋启式止回阀采用 WCB 阀体，旋启式结构自动防止介质倒流，保护管路与设备安全。</p><p>全通径低流阻设计，适用于水、油、蒸汽及一般腐蚀性介质。</p>",
      descriptionEn: "<p>Swing check valve with WCB body, automatically prevents backflow to protect pipelines and equipment.</p><p>Full bore low resistance for water, oil, steam and general corrosive media.</p>",
      features: ["自动防倒流", "全通径低流阻", "多种材质可选"], featuresEn: ["Automatic backflow prevention", "Full bore low resistance", "Multiple materials"],
      coverImage: IMG_CHECK, images: [{ url: IMG_CHECK, alt: "法兰旋启式止回阀" }], price: 760
    },
    {
      tabSlug: "safety-valve", categorySlug: "safety-spring", slug: "safety-a48y", model: "HG-A48Y-16C DN80",
      name: "法兰弹簧全启式安全阀", nameEn: "Flanged Spring Full-Lift Safety Valve", subtitle: "超压自动排放，整定可调", subtitleEn: "Auto discharge on overpressure, adjustable set point",
      summary: "WCB 阀体，全启式弹簧结构，排放系数高，适用于蒸汽、空气、气体。", summaryEn: "WCB body, full-lift spring type, high discharge coefficient for steam, air and gas.",
      description: "<p>全启式弹簧安全阀超压自动开启，排放系数高，整定压力 0.1-4.0MPa 可调。</p><p>阀座硬质合金密封，广泛用于锅炉、压力容器与管道超压保护。</p>",
      descriptionEn: "<p>Full-lift spring safety valve opens automatically on overpressure with high discharge coefficient, set point adjustable 0.1-4.0MPa.</p><p>Stellite seat for boiler, pressure vessel and pipeline overpressure protection.</p>",
      features: ["超压自动开启", "整定压力可调", "阀座硬质合金密封"], featuresEn: ["Auto open on overpressure", "Adjustable set point", "Stellite seat sealing"],
      coverImage: IMG_SAFETY, images: [{ url: IMG_SAFETY, alt: "法兰弹簧全启式安全阀" }], price: 2200
    },
    {
      tabSlug: "regulating-valve", categorySlug: "regulating-globe", slug: "regulating-zjhp", model: "HG-ZJHP-16K DN50",
      name: "气动套筒调节阀", nameEn: "Pneumatic Cage Regulating Valve", subtitle: "调节精度高，泄漏等级 IV", subtitleEn: "High control accuracy, leakage class IV",
      summary: "气动薄膜执行机构，套筒导向阀芯，调节精度高，适用于苛刻工况。", summaryEn: "Pneumatic diaphragm actuator, cage-guided plug, high control accuracy for demanding services.",
      description: "<p>气动套筒调节阀采用气动薄膜执行机构，套筒导向阀芯，调节精度高，流量特性为等百分比或线性。</p><p>泄漏等级可达 IV/VI 级，适用于石油、化工、电力等行业的流量、压力、温度精确控制。</p>",
      descriptionEn: "<p>Pneumatic cage regulating valve with diaphragm actuator and cage-guided plug for high control accuracy, equal % or linear characteristic.</p><p>Leakage class IV/VI for precise flow, pressure and temperature control in oil, chemical and power industries.</p>",
      features: ["调节精度高", "可配电动/气动执行器", "多种阀内件可选"], featuresEn: ["High control accuracy", "Electric/pneumatic actuators", "Multiple trim options"],
      coverImage: IMG_REG, images: [{ url: IMG_REG, alt: "气动套筒调节阀" }], price: 6800
    },
  ];
  for (const p of products) {
    const { tabSlug, categorySlug, ...rest } = p;
    const data = { ...rest, tabId: tabBySlug[tabSlug], categoryId: catBySlug[categorySlug].id };
    const existing = await prisma.product.findUnique({ where: { slug: rest.slug } });
    if (existing) { await prisma.product.update({ where: { slug: rest.slug }, data }); }
    else { await prisma.product.create({ data }); }
  }

  // ---------- 商城分类与商品（米思米式规格组合×数量定价） ----------
  const shopCats = [
    { slug: "valve", name: "阀门", nameEn: "Valves", sortOrder: 0 },
    { slug: "fitting", name: "管阀件", nameEn: "Fittings", sortOrder: 1 },
  ];
  for (const c of shopCats) {
    await prisma.shopCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  const catValve = await prisma.shopCategory.findUnique({ where: { slug: "valve" } });
  const catFitting = await prisma.shopCategory.findUnique({ where: { slug: "fitting" } });
  const ballProduct = await prisma.product.findUnique({ where: { slug: "ball-2pc" } });
  const butterflyProduct = await prisma.product.findUnique({ where: { slug: "butterfly-dn200" } });

  const shopProducts = [
    {
      slug: "ball-valve-2pc-dn25", productId: ballProduct.id, categoryId: catValve.id,
      name: "两片式内螺纹球阀 DN25（304）", nameEn: "2-Piece Threaded Ball Valve DN25 (304)",
      summary: "304 不锈钢球阀，PTFE 密封，支持多种口径与材质规格组合选配。", summaryEn: "304 SS ball valve with PTFE seats, configurable by size and body material.",
      description: "<p>米思米式规格选配：口径、阀体材质、密封材质组合定价。</p><p>适用于水、油、气及弱腐蚀介质管路系统。</p>",
      descriptionEn: "<p>MISUMI-style configuration: size, body material and seat material combined pricing.</p><p>For water, oil, gas and mild corrosive media piping.</p>",
      coverImage: IMG_BALL, price: 128, originalPrice: 158, unit: "个", stock: 500, minOrder: 1, status: "published", featured: true, sortOrder: 0,
      priceTiers: [
        { qty: 10, price: 118 }, { qty: 50, price: 105 }, { qty: 200, price: 92 },
      ],
      specs: [
        {
          name: "公称通径", nameEn: "Size",
          options: [
            { label: "DN15 (1/2\")", labelEn: "DN15 (1/2\")", price: 0, stock: 200 },
            { label: "DN20 (3/4\")", labelEn: "DN20 (3/4\")", price: 12, stock: 200 },
            { label: "DN25 (1\")", labelEn: "DN25 (1\")", price: 25, stock: 200 },
            { label: "DN32 (1-1/4\")", labelEn: "DN32 (1-1/4\")", price: 48, stock: 100 },
            { label: "DN40 (1-1/2\")", labelEn: "DN40 (1-1/2\")", price: 72, stock: 100 },
            { label: "DN50 (2\")", labelEn: "DN50 (2\")", price: 105, stock: 100 },
          ],
        },
        {
          name: "阀体材质", nameEn: "Body Material",
          options: [
            { label: "304", labelEn: "304", price: 0, stock: 500 },
            { label: "316", labelEn: "316", price: 35, stock: 300 },
          ],
        },
        {
          name: "密封材质", nameEn: "Seat Material",
          options: [
            { label: "PTFE", labelEn: "PTFE", price: 0, stock: 500 },
            { label: "PPL", labelEn: "PPL", price: 18, stock: 300 },
          ],
        },
      ],
    },
    {
      slug: "butterfly-valve-dn100", productId: butterflyProduct.id, categoryId: catValve.id,
      name: "对夹式蝶阀 DN100（球墨铸铁）", nameEn: "Wafer Butterfly Valve DN100 (Ductile Iron)",
      summary: "EPDM 软密封蝶阀，按口径与密封材质规格选配。", summaryEn: "EPDM soft-seated butterfly valve, configurable by size and seat.",
      description: "<p>对夹式软密封蝶阀，支持电动/气动手轮操作方式选配。</p><p>适用于水处理、暖通空调系统。</p>",
      descriptionEn: "<p>Wafer soft-seated butterfly valve with electric/pneumatic/handwheel options.</p><p>For water treatment and HVAC systems.</p>",
      coverImage: IMG_BUTTERFLY, price: 860, originalPrice: 990, unit: "台", stock: 200, minOrder: 1, status: "published", featured: true, sortOrder: 1,
      priceTiers: [
        { qty: 5, price: 810 }, { qty: 20, price: 745 }, { qty: 50, price: 680 },
      ],
      specs: [
        {
          name: "公称通径", nameEn: "Size",
          options: [
            { label: "DN50", labelEn: "DN50", price: 0, stock: 100 },
            { label: "DN100", labelEn: "DN100", price: 240, stock: 100 },
            { label: "DN150", labelEn: "DN150", price: 520, stock: 100 },
            { label: "DN200", labelEn: "DN200", price: 780, stock: 100 },
          ],
        },
        {
          name: "操作方式", nameEn: "Operator",
          options: [
            { label: "手轮", labelEn: "Handwheel", price: 0, stock: 200 },
            { label: "蜗轮蜗杆", labelEn: "Gearbox", price: 260, stock: 100 },
          ],
        },
      ],
    },
    {
      slug: "check-valve-dn50", categoryId: catValve.id,
      name: "升降式止回阀 DN50（304）", nameEn: "Lift Check Valve DN50 (304)",
      summary: "304 不锈钢升降式止回阀，自动防倒流。", summaryEn: "304 SS lift check valve with automatic backflow prevention.",
      description: "<p>304 不锈钢升降式止回阀，密封可靠，适用于水、油及弱腐蚀介质。</p>",
      descriptionEn: "<p>304 SS lift check valve, reliable sealing for water, oil and mildly corrosive media.</p>",
      coverImage: IMG_CHECK, price: 380, unit: "个", stock: 300, minOrder: 1, status: "published", sortOrder: 2,
      priceTiers: [
        { qty: 10, price: 350 }, { qty: 50, price: 315 },
      ],
      specs: [
        {
          name: "公称通径", nameEn: "Size",
          options: [
            { label: "DN25", labelEn: "DN25", price: 0, stock: 100 },
            { label: "DN50", labelEn: "DN50", price: 85, stock: 100 },
            { label: "DN80", labelEn: "DN80", price: 210, stock: 100 },
          ],
        },
      ],
    },
    {
      slug: "tube-fitting-1-2", categoryId: catFitting.id,
      name: "卡套接头 1/2\"（316L，世伟洛克式）", nameEn: "Tube Fitting 1/2\" (316L, Swagelok-style)",
      summary: "316L 不锈钢卡套接头，双卡套设计，密封可靠可重复拆装。", summaryEn: "316L stainless steel tube fitting with twin-ferrule design for reliable reusable connections.",
      description: "<p>双卡套式管接头，316L 材质，适用于高压气体与液体系统。</p><p>可配套卡套管、截止阀等精密管阀件使用。</p>",
      descriptionEn: "<p>Twin-ferrule tube fitting in 316L for high-pressure gas and liquid systems.</p><p>Pairs with tubing and precision valves.</p>",
      coverImage: IMG_CHECK, price: 45, unit: "个", stock: 1000, minOrder: 10, status: "published", featured: true, sortOrder: 3,
      priceTiers: [
        { qty: 50, price: 40 }, { qty: 200, price: 35 }, { qty: 1000, price: 28 },
      ],
      specs: [
        {
          name: "规格", nameEn: "Size",
          options: [
            { label: "1/4\"", labelEn: "1/4\"", price: 0, stock: 500 },
            { label: "3/8\"", labelEn: "3/8\"", price: 8, stock: 500 },
            { label: "1/2\"", labelEn: "1/2\"", price: 16, stock: 500 },
            { label: "6mm", labelEn: "6mm", price: 6, stock: 500 },
            { label: "8mm", labelEn: "8mm", price: 10, stock: 500 },
            { label: "10mm", labelEn: "10mm", price: 14, stock: 500 },
          ],
        },
        {
          name: "接头类型", nameEn: "Type",
          options: [
            { label: "直通", labelEn: "Straight", price: 0, stock: 1000 },
            { label: "直角", labelEn: "Elbow", price: 10, stock: 500 },
            { label: "三通", labelEn: "Tee", price: 18, stock: 500 },
          ],
        },
      ],
    },
  ];
  for (const sp of shopProducts) {
    const existing = await prisma.shopProduct.findUnique({ where: { slug: sp.slug } });
    if (existing) { await prisma.shopProduct.update({ where: { slug: sp.slug }, data: sp }); }
    else { await prisma.shopProduct.create({ data: sp }); }
  }

  // ---------- 服务 ----------
  const services = [
    {
      slug: "technical-support", title: "技术支持", titleEn: "Technical Support",
      subtitle: "专业选型与技术咨询", subtitleEn: "Professional selection and technical consultation",
      description: "<p>VALTRIX提供专业的阀门选型、技术咨询与系统解决方案服务，帮助客户选择最合适的阀门产品。</p>",
      descriptionEn: "<p>VALTRIX provides professional valve selection, technical consultation and system solutions to help customers choose the right valves.</p>",
      features: ["选型咨询", "技术方案设计", "现场勘察支持"], featuresEn: ["Selection consultation", "Technical solution design", "On-site survey support"],
      process: [
        { title: "需求沟通", desc: "了解工况与需求", titleEn: "Requirement", descEn: "Understand service conditions" },
        { title: "方案设计", desc: "阀门选型与方案", titleEn: "Design", descEn: "Valve selection and solution" },
        { title: "报价交付", desc: "报价与交期确认", titleEn: "Quote", descEn: "Pricing and delivery" },
      ],
      icon: "support", sortOrder: 0, status: "published",
    },
    {
      slug: "custom-manufacturing", title: "定制加工", titleEn: "Custom Manufacturing",
      subtitle: "非标阀门与定制服务", subtitleEn: "Non-standard valves and customization",
      description: "<p>支持非标阀门定制，包括特殊材质、特殊连接方式与特殊工况产品，满足客户个性化需求。</p>",
      descriptionEn: "<p>Non-standard valve customization including special materials, connections and service conditions.</p>",
      features: ["非标定制", "特殊材质加工", "小批量生产"], featuresEn: ["Non-standard customization", "Special materials", "Small batch production"],
      process: [
        { title: "需求确认", desc: "图纸与技术参数", titleEn: "Requirement", descEn: "Drawings and parameters" },
        { title: "打样生产", desc: "样品制作与验证", titleEn: "Prototype", descEn: "Sample making and validation" },
        { title: "批量交付", desc: "批量生产与质检", titleEn: "Production", descEn: "Batch production and QC" },
      ],
      icon: "custom", sortOrder: 1, status: "published",
    },
    {
      slug: "maintenance-service", title: "维修保养", titleEn: "Maintenance Service",
      subtitle: "阀门检修与备件供应", subtitleEn: "Valve overhaul and spares",
      description: "<p>提供阀门检修、密封件更换、安全阀整定校验与备件供应服务，保障阀门长期可靠运行。</p>",
      descriptionEn: "<p>Valve overhaul, seal replacement, safety valve set-point testing and spares supply keep valves reliable.</p>",
      features: ["阀门检修", "密封件更换", "安全阀整定校验"], featuresEn: ["Valve overhaul", "Seal replacement", "Safety valve set-point testing"],
      process: [
        { title: "故障诊断", desc: "检测与问题定位", titleEn: "Diagnosis", descEn: "Inspection and troubleshooting" },
        { title: "维修更换", desc: "维修与部件更换", titleEn: "Repair", descEn: "Repair and part replacement" },
        { title: "测试交付", desc: "压力测试与交付", titleEn: "Testing", descEn: "Pressure testing and delivery" },
      ],
      icon: "maintenance", sortOrder: 2, status: "published",
    },
    {
      slug: "training-consulting", title: "培训咨询", titleEn: "Training & Consulting",
      subtitle: "阀门知识与操作培训", subtitleEn: "Valve knowledge and operation training",
      description: "<p>为客户提供阀门选型、安装、操作与维护培训，提升客户团队的专业能力。</p>",
      descriptionEn: "<p>Training on valve selection, installation, operation and maintenance to empower customer teams.</p>",
      features: ["选型培训", "安装操作培训", "维护保养培训"], featuresEn: ["Selection training", "Installation and operation training", "Maintenance training"],
      process: [
        { title: "需求调研", desc: "培训需求与内容", titleEn: "Survey", descEn: "Training needs and content" },
        { title: "课程实施", desc: "理论+实操培训", titleEn: "Delivery", descEn: "Theory and hands-on training" },
        { title: "效果评估", desc: "考核与反馈", titleEn: "Evaluation", descEn: "Assessment and feedback" },
      ],
      icon: "training", sortOrder: 3, status: "published",
    },
  ];
  for (const s of services) {
    const existing = await prisma.service.findUnique({ where: { slug: s.slug } });
    if (existing) { await prisma.service.update({ where: { slug: s.slug }, data: s }); }
    else { await prisma.service.create({ data: s }); }
  }

  // ---------- 资源分类与资源 ----------
  const resCats = [
    { type: "manual", title: "产品手册", titleEn: "Manuals", description: "产品目录、安装与使用手册", descriptionEn: "Catalogs and installation manuals", icon: "book", sortOrder: 0 },
    { type: "certificate", title: "资质认证", titleEn: "Certificates", description: "产品认证与资质证书", descriptionEn: "Product certifications", icon: "cert", sortOrder: 1 },
    { type: "drawing", title: "图纸资料", titleEn: "Drawings", description: "产品图纸与技术资料", descriptionEn: "Product drawings and technical data", icon: "draw", sortOrder: 2 },
  ];
  for (const c of resCats) {
    await prisma.resourceCategory.upsert({ where: { type: c.type }, update: c, create: c });
  }
  const rcManual = await prisma.resourceCategory.findUnique({ where: { type: "manual" } });
  const rcCert = await prisma.resourceCategory.findUnique({ where: { type: "certificate" } });
  const rcDraw = await prisma.resourceCategory.findUnique({ where: { type: "drawing" } });

  const resources = [
    { categoryId: rcManual.id, slug: "valve-product-catalog-2026", title: "阀门产品总目录 2026", titleEn: "Valve Product Catalog 2026", description: "全系列阀门产品目录，含型号、规格与选型指南。", descriptionEn: "Full valve catalog with models, specifications and selection guide.", format: "PDF", size: "8.5MB", sortOrder: 0, status: "published" },
    { categoryId: rcManual.id, slug: "gate-valve-installation-manual", title: "闸阀安装使用说明书", titleEn: "Gate Valve Installation Manual", description: "闸阀的安装、操作与维护说明。", descriptionEn: "Installation, operation and maintenance instructions for gate valves.", format: "PDF", size: "2.1MB", sortOrder: 1, status: "published" },
    { categoryId: rcCert.id, slug: "iso9001-certificate", title: "ISO 9001 质量管理体系认证证书", titleEn: "ISO 9001 Certificate", description: "ISO 9001:2015 质量管理体系认证。", descriptionEn: "ISO 9001:2015 quality management system certification.", format: "PDF", size: "0.8MB", sortOrder: 0, status: "published" },
    { categoryId: rcCert.id, slug: "api6d-certificate", title: "API 6D 产品认证", titleEn: "API 6D Certificate", description: "球阀 API 6D 产品认证证书。", descriptionEn: "API 6D product certification for ball valves.", format: "PDF", size: "1.2MB", sortOrder: 1, status: "published" },
    { categoryId: rcDraw.id, slug: "ball-valve-dimension-drawing", title: "三片式球阀外形尺寸图", titleEn: "3-Piece Ball Valve Dimension Drawing", description: "三片式法兰球阀外形与连接尺寸图。", descriptionEn: "Dimension drawing for 3-piece flanged ball valves.", format: "PDF", size: "0.6MB", sortOrder: 0, status: "published" },
    { categoryId: rcDraw.id, slug: "butterfly-valve-dimension-drawing", title: "对夹式蝶阀外形尺寸图", titleEn: "Wafer Butterfly Valve Dimension Drawing", description: "对夹式蝶阀外形与连接尺寸图。", descriptionEn: "Dimension drawing for wafer butterfly valves.", format: "PDF", size: "0.5MB", sortOrder: 1, status: "published" },
  ];
  for (const r of resources) {
    const existing = await prisma.resourceItem.findUnique({ where: { slug: r.slug } });
    if (existing) { await prisma.resourceItem.update({ where: { slug: r.slug }, data: r }); }
    else { await prisma.resourceItem.create({ data: r }); }
  }

  // ---------- 关于 ----------
  const abouts = [
    {
      slug: "profile", title: "公司简介", titleEn: "Company Profile",
      subtitle: "专注精密阀门与流体控制元件", subtitleEn: "Focus on precision valves and fluid control components",
      content: [
        { heading: "关于我们", paragraphs: ["VALTRIX Co., Ltd.是一家专注于阀门研发、制造与服务的科技型企业，总部位于浙江温州永嘉。公司产品涵盖闸阀、球阀、蝶阀、止回阀、安全阀与调节阀等全系列工业阀门，广泛应用于石油化工、水处理、天然气、电力、冶金矿业与船舶海工等行业。", "公司建有数字化制造基地，配备数控加工中心、自动化装配线与氦质谱检漏设备，通过 ISO 9001 质量管理体系认证，产品可按 API、GB、JB 等标准生产。"] },
      ],
      contentEn: [
        { heading: "About Us", paragraphs: ["VALTRIXNOLOGY Co., Ltd. is a technology enterprise specializing in valve R&D, manufacturing and service, headquartered in Yongjia, Wenzhou, Zhejiang. Products cover full series of industrial valves including gate, ball, butterfly, check, safety and regulating valves for petrochemical, water treatment, natural gas, power, metallurgy, mining and marine industries.", "The company operates a digital manufacturing base with CNC machining centers, automated assembly lines and helium leak testing equipment, certified to ISO 9001, producing per API, GB and JB standards."] },
      ],
      highlights: [
        { label: "年产能", value: "50万台", labelEn: "Annual Capacity", valueEn: "500K units" },
        { label: "产品系列", value: "6大系列", labelEn: "Product Series", valueEn: "6 series" },
        { label: "覆盖行业", value: "10+行业", labelEn: "Industries", valueEn: "10+ industries" },
        { label: "服务客户", value: "1000+", labelEn: "Customers", valueEn: "1000+" },
      ],
      image: IMG_GATE, sortOrder: 0, status: "published",
      timeline: [
        { year: "2016", title: "公司成立", desc: "VALTRIX成立，专注阀门制造", titleEn: "Founded", descEn: "VALTRIX established" },
      ],
    },
    {
      slug: "history", title: "发展历程", titleEn: "Milestones",
      subtitle: "一步一个脚印，稳健发展", subtitleEn: "Steady growth step by step",
      content: [
        { heading: "发展历程", paragraphs: ["VALTRIX自成立以来，始终专注于阀门制造领域，持续投入研发与产能建设，逐步发展成为覆盖全系列工业阀门的专业制造商。"] },
      ],
      contentEn: [
        { heading: "Milestones", paragraphs: ["Since its founding, VALTRIX has focused on valve manufacturing with continuous R&D and capacity investment, growing into a professional manufacturer of full-series industrial valves."] },
      ],
      timeline: [
        { year: "2016", title: "公司成立", desc: "VALTRIX成立，专注阀门制造", titleEn: "Founded", descEn: "VALTRIX established" },
        { year: "2019", title: "ISO 认证", desc: "通过 ISO 9001 质量管理体系认证", titleEn: "ISO Certified", descEn: "Passed ISO 9001 certification" },
        { year: "2022", title: "产能扩充", desc: "二期生产基地投产，年产能 30 万台", titleEn: "Capacity Expansion", descEn: "Phase II plant online, 300K units capacity" },
        { year: "2026", title: "新基地投产", desc: "数字化新基地投产，年产能 50 万台", titleEn: "New Base Online", descEn: "Digital base online, 500K units capacity" },
      ],
      sortOrder: 1, status: "published",
    },
    {
      slug: "honors", title: "资质荣誉", titleEn: "Certifications",
      subtitle: "权威认证，品质保证", subtitleEn: "Certified quality assurance",
      content: [
        { heading: "资质荣誉", paragraphs: ["公司已通过 ISO 9001 质量管理体系认证，产品取得 API 6D、CE 等多项认证，满足国内外客户的质量要求。"] },
      ],
      contentEn: [
        { heading: "Certifications", paragraphs: ["The company is ISO 9001 certified with API 6D and CE product certifications, meeting quality requirements of domestic and international customers."] },
      ],
      certifications: [
        { name: "ISO 9001:2015", desc: "质量管理体系认证", nameEn: "ISO 9001:2015", descEn: "Quality Management System" },
        { name: "API 6D", desc: "管线阀门产品认证", nameEn: "API 6D", descEn: "Pipeline valve certification" },
        { name: "CE", desc: "欧盟安全认证", nameEn: "CE", descEn: "EU safety certification" },
      ],
      sortOrder: 2, status: "published",
    },
    {
      slug: "contact", title: "联系我们", titleEn: "Contact Us",
      subtitle: "欢迎洽谈合作", subtitleEn: "Welcome to contact us",
      content: [
        { heading: "联系我们", paragraphs: ["如需产品咨询、选型支持或商务合作，欢迎随时联系我们，VALTRIX将竭诚为您服务。"] },
      ],
      contentEn: [
        { heading: "Contact Us", paragraphs: ["For product inquiries, selection support or business cooperation, please contact us anytime. VALTRIX is at your service."] },
      ],
      sortOrder: 3, status: "published",
    },
  ];
  for (const a of abouts) {
    const existing = await prisma.aboutSection.findUnique({ where: { slug: a.slug } });
    if (existing) { await prisma.aboutSection.update({ where: { slug: a.slug }, data: a }); }
    else { await prisma.aboutSection.create({ data: a }); }
  }

  console.log("✅ 阀门内容种子完成");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
