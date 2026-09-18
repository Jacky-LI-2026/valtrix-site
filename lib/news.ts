export interface NewsItem {
  slug: string;
  title: string;
  titleEn: string;
  category: string;
  categoryEn: string;
  date: string;
  excerpt: string;
  excerptEn: string;
  content: string[];
  contentEn: string[];
  featured: boolean;
}

export const news: NewsItem[] = [
  {
    slug: "automated-valve-production-line",
    title: "VALTRIX不锈钢闸阀自动化产线正式投产",
    titleEn: "VALTRIX Launches Automated Stainless Steel Gate Valve Production Line",
    category: "公司新闻",
    categoryEn: "Company News",
    date: "2026-06-18",
    excerpt: "VALTRIX数字化车间新增不锈钢闸阀自动化装配与检测产线，实现壳体耐压、密封性能的全自动在线检测。",
    excerptEn: "VALTRIX adds an automated assembly and testing line for stainless steel gate valves in its digital workshop, achieving fully automatic online shell pressure and sealing performance testing.",
    content: [
      "近日，VALTRIX数字化车间新增的不锈钢闸阀自动化装配与检测产线正式投产。该产线集自动装配、自动试压、自动包装于一体，单线产能提升约 60%。",
      "产线配套氦质谱检漏与智能数据采集系统，每台阀门出厂前均自动完成壳体耐压、密封性能与气密性检测，检测数据全程可追溯。",
      "VALTRIX负责人表示，自动化产线的投产将进一步保障产品一致性，缩短标准品交期，为国内外客户提供更高品质的阀门产品。",
    ],
    contentEn: [
      "VALTRIX's new automated assembly and testing line for stainless steel gate valves has officially commenced production. Integrating automatic assembly, pressure testing and packaging, the line boosts single-line capacity by about 60%.",
      "Equipped with helium mass spectrometer leak detection and intelligent data collection, every valve automatically undergoes shell pressure, sealing and air-tightness tests with fully traceable records.",
      "The company representative said the new line will further ensure product consistency, shorten delivery times for standard products, and provide higher-quality valves for domestic and international customers.",
    ],
    featured: true,
  },
  {
    slug: "ball-valve-export-30-countries",
    title: "VALTRIX球阀产品出口突破 30 个国家和地区",
    titleEn: "VALTRIX Ball Valves Exported to 30+ Countries and Regions",
    category: "市场动态",
    categoryEn: "Market News",
    date: "2026-05-22",
    excerpt: "公司球阀系列产品已出口至 30 多个国家和地区，广泛服务于石油化工、水处理与天然气等国际项目。",
    excerptEn: "The company's ball valve series has been exported to 30+ countries and regions, widely serving international petrochemical, water treatment and natural gas projects.",
    content: [
      "VALTRIX球阀系列产品出口市场持续扩大，目前已覆盖 30 多个国家和地区，累计交付海外项目超千个。",
      "公司球阀产品涵盖两片式、三片式、法兰式等多种结构，采用 304/316L 不锈钢与 PTFE/PPL 密封，按 API、ISO 等国际标准生产，满足不同工况需求。",
      "未来公司将持续完善海外服务体系，为全球客户提供选型、安装与售后的一站式支持。",
    ],
    contentEn: [
      "VALTRIX's ball valve exports continue to expand, covering 30+ countries and regions with over 1,000 overseas projects delivered.",
      "The ball valve range covers two-piece, three-piece and flanged structures in 304/316L stainless steel with PTFE/PPL seats, manufactured to API, ISO and other international standards.",
      "The company will continue to improve its overseas service network, providing one-stop selection, installation and after-sales support for global customers.",
    ],
    featured: false,
  },
  {
    slug: "api6d-certification",
    title: "VALTRIX通过 API 6D 管线阀门产品认证",
    titleEn: "VALTRIX Passes API 6D Pipeline Valve Certification",
    category: "资质认证",
    categoryEn: "Certification",
    date: "2026-04-10",
    excerpt: "公司管线球阀、闸阀产品通过美国石油学会 API 6D 认证，标志产品符合国际油气行业高端要求。",
    excerptEn: "The company's pipeline ball valves and gate valves passed the American Petroleum Institute API 6D certification, meeting high-end international oil & gas requirements.",
    content: [
      "VALTRIX管线球阀与管线闸阀产品正式通过 API 6D 认证，产品设计、制造与试验均符合国际油气管道工程标准。",
      "API 6D 是国际油气行业广泛认可的管线阀门产品规范。此次认证通过，标志着公司产品在耐压等级、密封性能与可靠性方面达到国际先进水平。",
      "公司将持续推进 API 认证体系建设，为石油天然气长输管线等高端项目提供可靠产品。",
    ],
    contentEn: [
      "VALTRIX's pipeline ball valves and gate valves officially passed API 6D certification, with design, manufacturing and testing in full compliance with international oil & gas pipeline standards.",
      "API 6D is a widely recognized product specification for pipeline valves. Passing it marks the company's products reaching an internationally advanced level in pressure rating, sealing performance and reliability.",
      "The company will continue to strengthen its API certification system to supply reliable products for high-end long-distance oil & gas pipeline projects.",
    ],
    featured: true,
  },
  {
    slug: "smart-manufacturing-upgrade",
    title: "VALTRIX数字化质量追溯系统上线",
    titleEn: "VALTRIX Launches Digital Quality Traceability System",
    category: "公司新闻",
    categoryEn: "Company News",
    date: "2026-03-15",
    excerpt: "公司上线覆盖原材料、加工、装配、检测全流程的数字化质量追溯系统，实现一阀一码、全程可溯。",
    excerptEn: "The company launched a digital quality traceability system covering raw materials, machining, assembly and testing, with one valve one code and full traceability.",
    content: [
      "VALTRIX数字化质量追溯系统正式上线，覆盖原材料入库、机加工、装配、试压检测、包装出库全流程。",
      "每台阀门出厂时附带唯一追溯码，客户扫码即可查询材质报告、检测数据与出厂信息，实现一阀一码、全程可溯。",
      "系统的上线进一步提升了公司质量管控能力，为 API、CE 等认证体系的有效运行提供数据支撑。",
    ],
    contentEn: [
      "VALTRIX's digital quality traceability system has gone live, covering raw material intake, machining, assembly, pressure testing and packaging.",
      "Every valve ships with a unique traceability code; customers can scan to check material reports, test data and factory information.",
      "The system further strengthens quality control and provides data support for the effective operation of API, CE and other certification systems.",
    ],
    featured: false,
  },
  {
    slug: "marine-valve-delivery",
    title: "VALTRIX船用阀门批量交付船舶海工项目",
    titleEn: "VALTRIX Delivers Marine Valves in Batches for Shipbuilding Projects",
    category: "市场动态",
    categoryEn: "Market News",
    date: "2026-02-08",
    excerpt: "公司船用闸阀、截止阀、止回阀批量交付，通过船级社认证，应用于远洋船舶与海工平台。",
    excerptEn: "The company's marine gate, globe and check valves delivered in batches, certified by classification societies, for ocean-going vessels and offshore platforms.",
    content: [
      "VALTRIX船用阀门产品实现批量交付，应用于多艘远洋船舶与海工平台项目，产品通过船级社认证。",
      "船用阀门采用耐海水腐蚀材质与船级社认证标准制造，具备优异的密封性能与耐候能力，满足船用工况要求。",
      "公司将持续深耕船舶海工市场，完善船用阀门产品系列，服务更多海工客户。",
    ],
    contentEn: [
      "VALTRIX has delivered marine valve products in batches for multiple ocean-going vessel and offshore platform projects, with products certified by classification societies.",
      "Marine valves are made of seawater-corrosion-resistant materials to classification society standards, offering excellent sealing performance and weather resistance.",
      "The company will continue to expand in the marine and offshore market, improving its marine valve series for more customers.",
    ],
    featured: false,
  },
];

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return news.find((n) => n.slug === slug);
}

export function getAllNewsSlugs(): string[] {
  return news.map((n) => n.slug);
}
