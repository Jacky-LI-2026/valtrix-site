// VALTRIX 行业应用数据（半导体超高纯管阀件定位）
// 本文件为前台行业数据 API 失败时的静态回退数据，与 DB industries 表保持一致

export interface Industry {
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  challenges: string[];
  challengesEn: string[];
  solutions: { title: string; desc: string; titleEn: string; descEn: string }[];
  products: string[];
  productsEn: string[];
  cases: { title: string; desc: string; titleEn: string; descEn: string }[];
}

export const industries: Industry[] = [
  {
    slug: "semiconductor",
    name: "半导体制造",
    nameEn: "Semiconductor Manufacturing",
    tagline: "晶圆厂超高纯流体制程",
    taglineEn: "Ultra-high-purity fluid control for wafer fabs",
    description:
      "VALTRIX 为半导体工艺设备与气体输送系统提供超高纯级接头、隔膜阀与减压阀。全部湿润部件采用 316L 不锈钢电化学抛光表面，按半导体标准进行氦检漏测试，满足先进制程对颗粒、金属离子与泄漏率的严苛要求。",
    descriptionEn:
      "VALTRIX supplies UHP-grade fittings, diaphragm valves and regulators engineered for semiconductor process tools and gas delivery systems. All wetted parts are 316L stainless steel with electro-polished surfaces, helium-leak tested to semiconductor standards.",
    challenges: [
      "制程气体纯度要求极高，泄漏率需达到 1×10⁻⁹ Pa·m³/s 以下",
      "颗粒与金属离子污染直接导致良率损失",
      "腐蚀性工艺气体对材料耐蚀性要求苛刻",
      "高纯系统需满足 24/7 连续稳定运行",
    ],
    challengesEn: [
      "Extreme process gas purity with leak rates below 1×10⁻⁹ Pa·m³/s",
      "Particles and metal ions directly impact yield",
      "Corrosive process gases demand high material resistance",
      "UHP systems must run reliably 24/7",
    ],
    solutions: [
      {
        title: "超高纯管阀件成套",
        desc: "VCR 面密封接头、隔膜阀、减压阀与过滤器全系列配套，满足 SEMI 标准",
        titleEn: "UHP valve and fitting package",
        descEn: "Full range of VCR face seal fittings, diaphragm valves, regulators and filters per SEMI standards",
      },
      {
        title: "氦检漏与表面处理保障",
        desc: "电化学抛光 + 氦质谱检漏，确保颗粒与泄漏率达标",
        titleEn: "Helium leak test and surface finish",
        descEn: "Electro-polished surfaces and helium mass-spectrometry leak testing ensure spec compliance",
      },
    ],
    products: ["VCR 面密封接头", "隔膜阀", "减压阀", "气体过滤器"],
    productsEn: ["VCR Face Seal Fittings", "Diaphragm Valves", "Pressure Reducers", "Gas Filters"],
    cases: [
      {
        title: "晶圆厂气柜管路配套",
        desc: "为 12 英寸晶圆厂气柜提供隔膜阀与 VCR 接头成套，氦检漏一次通过",
        titleEn: "Wafer fab gas cabinet package",
        descEn: "Supplied diaphragm valves and VCR fittings for 300mm fab gas cabinets, helium leak test passed on first attempt",
      },
    ],
  },
  {
    slug: "biopharmaceutical",
    name: "生物医药",
    nameEn: "Biopharmaceutical",
    tagline: "可清洗可排空的制药流体系统",
    taglineEn: "Cleanable, drainable fluid systems for pharma processes",
    description:
      "从 WFI 分配系统到层析系统，VALTRIX 提供卫生级流体控制元件，表面光洁、无死角结构、材料全程可追溯，满足 FDA/EMA 及 GMP 对制药流体系统的验证要求。",
    descriptionEn:
      "From WFI distribution to chromatography skids, VALTRIX provides sanitary-grade flow control components with smooth surface finishes, crevice-free construction and full material traceability.",
    challenges: [
      "系统需满足 CIP/SIP 在线清洗灭菌要求",
      "残留风险要求无死角、可完全排空的结构",
      "材料需符合 USP Class VI / FDA 合规",
      "批记录要求材料与工艺全程可追溯",
    ],
    challengesEn: [
      "Systems must support CIP/SIP cleaning and sterilization",
      "No-crevice, fully drainable designs to avoid residue",
      "Materials must meet USP Class VI / FDA compliance",
      "Batch records require full material and process traceability",
    ],
    solutions: [
      {
        title: "卫生级流体控制方案",
        desc: "卫生级隔膜阀、取样阀与快装接头，表面 Ra≤0.4μm",
        titleEn: "Sanitary fluid control solutions",
        descEn: "Sanitary diaphragm valves, sampling valves and clamp fittings with Ra≤0.4μm finishes",
      },
      {
        title: "可追溯与验证支持",
        desc: "提供 EN 10204 3.1 材质证书与完整批次追溯文档",
        titleEn: "Traceability and validation support",
        descEn: "EN 10204 3.1 material certificates and complete batch traceability documentation",
      },
    ],
    products: ["卫生级隔膜阀", "取样阀", "VCR 接头", "过滤器"],
    productsEn: ["Sanitary Diaphragm Valves", "Sampling Valves", "VCR Fittings", "Filters"],
    cases: [
      {
        title: "生物制药 WFI 系统配套",
        desc: "为单抗生产线 WFI 分配系统提供卫生级隔膜阀，通过 GMP 验证",
        titleEn: "Biopharma WFI system supply",
        descEn: "Supplied sanitary diaphragm valves for a monoclonal antibody WFI loop, passed GMP validation",
      },
    ],
  },
  {
    slug: "led-display",
    name: "LED显示",
    nameEn: "LED & Display",
    tagline: "外延与薄膜制程精密气体控制",
    taglineEn: "Precise gas control for epitaxy and thin-film processes",
    description:
      "MOCVD 与溅射工艺需要稳定、可重复的气体输送。VALTRIX 减压阀与可集成质量流量计的汇流排保持外延生长与 PVD 腔室的精确压力控制，保障 LED 与显示面板的制程一致性。",
    descriptionEn:
      "MOCVD and sputtering processes require stable, repeatable gas delivery. VALTRIX regulators and mass-flow-ready manifolds maintain tight pressure control for epitaxial growth and PVD chambers.",
    challenges: [
      "外延生长对气体流量与压力稳定性要求极高",
      "特殊源气体（MO 源）需高耐蚀材料",
      "频繁更换工艺气体要求系统切换可靠",
      "洁净度影响外延层晶体质量",
    ],
    challengesEn: [
      "Epitaxial growth demands extremely stable gas flow and pressure",
      "MO sources require highly corrosion-resistant materials",
      "Frequent gas switching must be reliable",
      "Cleanliness affects epitaxial crystal quality",
    ],
    solutions: [
      {
        title: "外延制程气体控制",
        desc: "高精度减压阀与汇流排，压力控制稳定性达 ±0.5%",
        titleEn: "Epitaxy gas control",
        descEn: "High-precision regulators and manifolds with ±0.5% pressure stability",
      },
      {
        title: "MO 源专用管路配套",
        desc: "耐蚀隔膜阀与 VCR 接头，适配有机金属源气体",
        titleEn: "MO source line package",
        descEn: "Corrosion-resistant diaphragm valves and VCR fittings for organometallic source gases",
      },
    ],
    products: ["减压阀", "隔膜阀", "VCR 接头", "汇流排"],
    productsEn: ["Pressure Reducers", "Diaphragm Valves", "VCR Fittings", "Manifolds"],
    cases: [
      {
        title: "LED 外延线气体系统改造",
        desc: "为某 LED 外延产线更换减压阀与管路，压力波动降低 60%",
        titleEn: "LED epitaxy gas system upgrade",
        descEn: "Replaced regulators and lines for an LED epitaxy line, cutting pressure fluctuation by 60%",
      },
    ],
  },
  {
    slug: "solar-photovoltaic",
    name: "光伏",
    nameEn: "Solar & Photovoltaic",
    tagline: "电池片制造高可靠性流体元件",
    taglineEn: "High-reliability fluid components for cell manufacturing",
    description:
      "面向扩散、PECVD 与激光选择性发射极产线，VALTRIX 提供兼具成本效益与超高纯合规性的接头和阀门，在大规模电池片生产中维持气体纯度与设备稳定运行。",
    descriptionEn:
      "For diffusion, PECVD and laser-selective emitter lines, VALTRIX delivers cost-effective yet UHP-compliant fittings and valves that maintain gas purity across high-volume cell production.",
    challenges: [
      "产线规模大，设备连续运行时间长",
      "工艺气体种类多，切换频繁",
      "降本压力要求元件兼具性能与性价比",
      "真空与正压工艺并存，密封要求全面",
    ],
    challengesEn: [
      "Large-scale lines with long continuous operation",
      "Many process gases with frequent switching",
      "Cost pressure requires performance and value",
      "Vacuum and positive-pressure processes need full sealing",
    ],
    solutions: [
      {
        title: "电池片产线管阀配套",
        desc: "隔膜阀、单向阀与过滤器系列，适配扩散/PECVD 工艺",
        titleEn: "Cell line valve and fitting supply",
        descEn: "Diaphragm valves, check valves and filters for diffusion/PECVD processes",
      },
      {
        title: "批量交付与品质一致",
        desc: "规模化生产与全检体系，确保批次一致性",
        titleEn: "Volume delivery with consistent quality",
        descEn: "Scaled production and full inspection ensure batch consistency",
      },
    ],
    products: ["隔膜阀", "单向阀", "气体过滤器", "VCR 接头"],
    productsEn: ["Diaphragm Valves", "Check Valves", "Gas Filters", "VCR Fittings"],
    cases: [
      {
        title: "光伏电池片厂气体系统配套",
        desc: "为 10GW 电池片产线提供隔膜阀与过滤器成套，稳定运行无泄漏",
        titleEn: "PV cell fab gas system supply",
        descEn: "Supplied diaphragm valves and filters for a 10GW cell line with leak-free operation",
      },
    ],
  },
  {
    slug: "hydrogen-energy",
    name: "氢能",
    nameEn: "Hydrogen Energy",
    tagline: "氢系统防漏元件",
    taglineEn: "Leak-tight components for hydrogen systems",
    description:
      "从电解槽撬装到加氢站，VALTRIX 元件专为氢服务设计并通过氦检漏验证，包括入口压力高达 3500 psig 的高压减压应用，保障氢能系统安全可靠。",
    descriptionEn:
      "From electrolyser skids to refuelling stations, VALTRIX components are designed and helium-tested for hydrogen service, including high-pressure reducer applications up to 3500 psig inlet.",
    challenges: [
      "氢分子极小，易泄漏且易燃易爆",
      "高压氢环境对材料有氢脆风险",
      "加氢站需高频次、高可靠性操作",
      "系统需满足国际氢安全标准",
    ],
    challengesEn: [
      "Tiny hydrogen molecules leak easily and are flammable",
      "High-pressure hydrogen risks material embrittlement",
      "Refuelling stations need high-frequency reliable operation",
      "Systems must meet international hydrogen safety standards",
    ],
    solutions: [
      {
        title: "氢系统高压减压方案",
        desc: "高压减压阀与 VCR 接头，入口压力达 3500 psig",
        titleEn: "High-pressure hydrogen reduction",
        descEn: "High-pressure regulators and VCR fittings rated to 3500 psig inlet",
      },
      {
        title: "全氦检漏保障",
        desc: "每件产品经氦质谱检漏，泄漏率满足氢安全要求",
        titleEn: "Full helium leak testing",
        descEn: "Every product helium mass-spectrometry tested to hydrogen safety leak rates",
      },
    ],
    products: ["高压减压阀", "隔膜阀", "VCR 接头", "单向阀"],
    productsEn: ["High-Pressure Reducers", "Diaphragm Valves", "VCR Fittings", "Check Valves"],
    cases: [
      {
        title: "加氢站管阀配套",
        desc: "为加氢站提供高压减压阀与接头成套，通过 105MPa 氢循环测试",
        titleEn: "Hydrogen station supply",
        descEn: "Supplied high-pressure reducers and fittings for a hydrogen station, passed 105MPa hydrogen cycling",
      },
    ],
  },
  {
    slug: "research-labs",
    name: "科研实验室",
    nameEn: "Research Laboratories",
    tagline: "研发与中试气体系统",
    taglineEn: "Reliable gas systems for R&D and pilot plants",
    description:
      "高校、国家实验室与中试设施依赖 VALTRIX 提供灵活、模块化的气体处理方案——从台面汇流排到完整的分析仪器气路面板，支持科研环境对快速搭建与可靠供气的双重要求。",
    descriptionEn:
      "Universities, national labs and pilot facilities rely on VALTRIX for flexible, modular gas handling — from bench-top manifolds to complete analytical instrument gas panels.",
    challenges: [
      "实验气体种类多、用量小、切换频繁",
      "科研环境要求系统快速搭建与灵活调整",
      "微量分析对气体纯度与背景噪声敏感",
      "中试放大需要与量产一致的高纯保障",
    ],
    challengesEn: [
      "Many gas types, small volumes, frequent switching",
      "Rapid setup and flexible reconfiguration required",
      "Trace analysis is sensitive to purity and background",
      "Pilot scale-up needs production-grade purity",
    ],
    solutions: [
      {
        title: "模块化气路面板",
        desc: "台面/壁挂式气路面板，集成减压、过滤与切换功能",
        titleEn: "Modular gas panels",
        descEn: "Bench-top and wall-mount panels integrating regulation, filtration and switching",
      },
      {
        title: "定制气路快速交付",
        desc: "标准件库存 + 快速定制，缩短实验室搭建周期",
        titleEn: "Fast custom gas line delivery",
        descEn: "Standard stock plus rapid customization shortens lab build time",
      },
    ],
    products: ["气路面板", "减压阀", "VCR 接头", "针阀"],
    productsEn: ["Gas Panels", "Pressure Reducers", "VCR Fittings", "Needle Valves"],
    cases: [
      {
        title: "国家实验室气体系统",
        desc: "为某国家级实验室搭建分析仪器气路系统，交付即用",
        titleEn: "National lab gas system",
        descEn: "Built analytical instrument gas systems for a national laboratory, ready to use on delivery",
      },
    ],
  },
];
