export interface AboutSection {
  slug: string;
  title: string;
  titleEn: string;
  titleJa?: string;
  titleKo?: string;
  titleFr?: string;
  titleAr?: string;
  subtitle: string;
  subtitleEn: string;
  subtitleJa?: string;
  subtitleKo?: string;
  subtitleFr?: string;
  subtitleAr?: string;
  content: { heading: string; headingEn: string; headingJa?: string; headingKo?: string; headingFr?: string; headingAr?: string; paragraphs: string[]; paragraphsEn: string[]; paragraphsJa?: string[]; paragraphsKo?: string[]; paragraphsFr?: string[]; paragraphsAr?: string[] }[];
  highlights?: { label: string; labelEn: string; value: string; valueEn: string }[];
  timeline?: { year: string; title: string; titleEn: string; titleJa?: string; titleKo?: string; titleFr?: string; titleAr?: string; desc: string; descEn: string; descJa?: string; descKo?: string; descFr?: string; descAr?: string }[];
  certifications?: { name: string; nameEn: string; nameJa?: string; nameKo?: string; nameFr?: string; nameAr?: string; issuer: string; issuerEn: string; issuerJa?: string; issuerKo?: string; issuerFr?: string; issuerAr?: string; year: string }[];
}

export const aboutSections: AboutSection[] = [
  {
    slug: "profile",
    title: "公司简介",
    titleEn: "Company Profile",
    titleJa: "会社概要",
    titleKo: "회사 소개",
    titleFr: "Profil de l'entreprise",
    titleAr: "نبذة عن الشركة",
    subtitle: "专注精密流体控制与工业阀门，可靠之选",
    subtitleEn: "Focused on precision fluid control and industrial valves, the reliable choice",
    subtitleJa: "精密流体制御と工業用バルブに注力、信頼の選択",
    subtitleKo: "정밀 유체 제어와 산업용 밸브에 집중, 신뢰할 수 있는 선택",
    subtitleFr: "Spécialisé dans le contrôle de fluide de précision et les vannes industrielles, le choix fiable",
    subtitleAr: "متخصصون في التحكم الدقيق في السوائل والصمامات الصناعية، الخيار الموثوق",
    content: [
      {
        heading: "关于VALTRIX",
        headingEn: "About VALTRIX",
        paragraphs: [
          "VALTRIX Co., Ltd.成立于2016年，是一家专注于工业阀门与精密流体控制元件研发、制造与服务的科技型企业。公司总部位于中国温州，依托当地成熟的泵阀产业链，产品覆盖闸阀、球阀、蝶阀、止回阀、安全阀、调节阀六大系列，广泛应用于石油化工、水处理、天然气、电力能源、冶金矿业与船舶海工等领域。",
          "公司对标国际一流流体控制品牌，坚持精密制造与严苛品控，拥有 ISO9001 质量管理体系认证，产品通过壳体耐压与密封性能双重出厂检测，为全球客户提供高品质、高可靠的流体系统解决方案。",
        ],
        paragraphsEn: [
          "VALTRIXNOLOGY Co., Ltd. was founded in 2016, specializing in R&D, manufacturing and services of industrial valves and precision fluid control components. Headquartered in Wenzhou, China, the company covers six valve series: gate, ball, butterfly, check, safety and regulating valves, serving petrochemical, water treatment, natural gas, power, metallurgy & mining and marine industries.",
          "Benchmarking international first-class fluid control brands, the company insists on precision manufacturing and strict quality control, holds ISO9001 certification, and every valve passes shell pressure and sealing performance tests before shipment.",
        ],
      },
      {
        heading: "核心能力",
        headingEn: "Core Capabilities",
        paragraphs: [
          "精密制造：316L 不锈钢、双相钢、哈氏合金等多材质加工能力，关键密封面采用数控精密加工与研磨工艺。",
          "质量保证：每台阀门出厂前均经过壳体耐压、密封性能与气密性三重检测，配套完整的质量追溯体系。",
          "快速交付：标准品常备库存，3-7 天交付；定制品 20-30 天交付，支持加急排产。",
          "技术支持：资深工程师提供选型计算、工况评估与现场技术服务，覆盖售前、售中、售后全周期。",
        ],
        paragraphsEn: [
          "Precision manufacturing: multi-material machining of 316L stainless steel, duplex steel and Hastelloy, with CNC precision machining and lapping for critical sealing surfaces.",
          "Quality assurance: every valve passes shell pressure, sealing and air-tightness tests before shipment, with a complete quality traceability system.",
          "Fast delivery: standard products in 3-7 days from stock, customized products in 20-30 days, with expedited scheduling support.",
          "Technical support: senior engineers provide selection calculation, working condition evaluation and on-site service throughout the whole life cycle.",
        ],
      },
    ],
    highlights: [
      { label: "成立年份", labelEn: "Founded", value: "2016", valueEn: "2016" },
      { label: "产品系列", labelEn: "Product Series", value: "6", valueEn: "6" },
      { label: "服务行业", labelEn: "Industries Served", value: "20+", valueEn: "20+" },
      { label: "全球客户", labelEn: "Global Customers", value: "3000+", valueEn: "3000+" },
    ],
  },
  {
    slug: "culture",
    title: "企业文化",
    titleEn: "Corporate Culture",
    titleJa: "企業文化",
    titleKo: "기업 문화",
    titleFr: "Culture d'entreprise",
    titleAr: "ثقافة الشركة",
    subtitle: "以可靠为本，以品质为先",
    subtitleEn: "Reliability first, quality above all",
    subtitleJa: "信頼性を基本に、品質を最優先に",
    subtitleKo: "신뢰를 근본으로, 품질을 최우선으로",
    subtitleFr: "La fiabilité avant tout, la qualité par-dessus tout",
    subtitleAr: "الموثوقية أساس، الجودة أولاً",
    content: [
      {
        heading: "企业使命",
        headingEn: "Our Mission",
        headingJa: "企業ミッション",
        headingKo: "기업 미션",
        headingFr: "Notre mission",
        headingAr: "مهمتنا",
        paragraphs: [
          "让每一道流体都安全可控——为工业客户提供可靠、耐用、可追溯的阀门与流体控制产品，保障装置安全稳定运行。",
          "以匠心精神打磨每一件产品，用可靠品质赢得长期信任。",
        ],
        paragraphsEn: [
          "Making every fluid safe and controllable: providing reliable, durable and traceable valves and fluid control products to keep industrial facilities running safely and stably.",
          "Crafting every product with craftsmanship and winning long-term trust through reliable quality.",
        ],
        paragraphsJa: [
          "あらゆる流体を安全に制御する—工業顧客に信頼性・耐久性・トレーサビリティのあるバルブ・流体制御製品を提供し、プラントの安全・安定稼働を保障します。",
          "匠の精神で製品を磨き上げ、信頼できる品質で長期的な信頼を勝ち取ります。",
        ],
        paragraphsKo: [
          "모든 유체를 안전하고 제어 가능하게—산업 고객에게 신뢰할 수 있고 내구성 있으며 추적 가능한 밸브 및 유체 제어 제품을 제공하여 설비의 안정적인 운영을 보장합니다.",
          "장인 정신으로 모든 제품을 연마하고 신뢰할 수 있는 품질로 장기적인 신뢰를 얻습니다.",
        ],
        paragraphsFr: [
          "Rendre chaque fluide sûr et contrôlable : fournir des vannes et des produits de contrôle de fluide fiables, durables et traçables aux clients industriels, pour garantir un fonctionnement sûr et stable des installations.",
          "Affiner chaque produit avec un savoir-faire artisanal et gagner une confiance à long terme grâce à une qualité fiable.",
        ],
        paragraphsAr: [
          "جعل كل سائل آمنًا وقابلًا للتحكم — تزويد العملاء الصناعيّين بصمامات ومنتجات التحكم في السوائل الموثوقة والمتينة والقابلة للتتبع، لضمان تشغيل المنشآت بأمان واستقرار.",
          "صقل كل منتج بروح الحرفية، وكسب الثقة طويلة الأمد من خلال الجودة الموثوقة.",
        ],
      },
      {
        heading: "核心价值观",
        headingEn: "Core Values",
        headingJa: "コアバリュー",
        headingKo: "핵심 가치관",
        headingFr: "Valeurs fondamentales",
        headingAr: "القيم الأساسية",
        paragraphs: [
          "可靠：对客户承诺的产品性能与寿命负责，绝不妥协。",
          "专业：深耕流体控制领域，以技术能力解决复杂工况问题。",
          "务实：以客户实际需求为导向，提供切实可行的解决方案。",
          "共赢：与供应商、客户、员工共同成长，创造长期价值。",
        ],
        paragraphsEn: [
          "Reliability: committed to the promised performance and service life, never compromising.",
          "Professionalism: deep expertise in fluid control, solving complex working-condition problems with technical capability.",
          "Pragmatism: oriented by actual customer needs, delivering practical and feasible solutions.",
          "Win-win: growing together with suppliers, customers and employees to create long-term value.",
        ],
        paragraphsJa: [
          "信頼性：顧客に約束した製品性能と寿命に責任を持ち、決して妥協しません。",
          "専門性：流体制御分野を深く究め、技術力で複雑な工况問題を解決します。",
          "実践性：顧客の実際のニーズを指向し、実行可能なソリューションを提供します。",
          "ウィンウィン：サプライヤー・顧客・従業員と共に成長し、長期的な価値を創造します。",
        ],
        paragraphsKo: [
          "신뢰성: 고객에게 약속한 제품 성능과 수명에 책임을 지며 결코 타협하지 않습니다.",
          "전문성: 유체 제어 분야를 깊이 연구하여 기술력으로 복잡한 공정 문제를 해결합니다.",
          "실용성: 고객의 실제需求를 지향하며 실행 가능한 솔루션을 제공합니다.",
          "상생: 공급업체, 고객, 직원과 함께 성장하여 장기적인 가치를 창출합니다.",
        ],
        paragraphsFr: [
          "Fiabilité : responsable des performances et de la durée de vie promises au client, sans jamais compromettre.",
          "Professionnalisme : expertise approfondie dans le contrôle des fluides, résolution de problèmes complexes grâce à la capacité technique.",
          "Pragmatisme : orienté par les besoins réels des clients, en fournissant des solutions pratiques et réalisables.",
          "Gagnant-gagnant : croître ensemble avec les fournisseurs, les clients et les employés pour créer une valeur à long terme.",
        ],
        paragraphsAr: [
          "الموثوقية: المسؤولية عن أداء المنتج وعمره الافتراضي الموعودين للعميل، دون أي مساومة.",
          "الاحترافية: الخبرة العميقة في مجال التحكم في السوائل، وحل مشكلات ظروف التشغيل المعقدة بالقدرة التقنية.",
          "الواقعية: التوجه بالاحتياجات الفعلية للعملاء، وتقديم حلول عملية وقابلة للتنفيذ.",
          "الربح المشترك: النمو مع الموردين والعملاء والموظفين لخلق قيمة طويلة الأمد.",
        ],
      },
    ],
  },
  {
    slug: "history",
    title: "发展历程",
    titleEn: "Company History",
    titleJa: "沿革",
    titleKo: "회사 연혁",
    titleFr: "Historique",
    titleAr: "تاريخ الشركة",
    subtitle: "十年深耕，稳步前行",
    subtitleEn: "A decade of steady progress",
    subtitleJa: "十年の深耕、着実な前進",
    subtitleKo: "십년간의 심화, 안정적인 전진",
    subtitleFr: "Une décennie de progrès constants",
    subtitleAr: "عقد من التقدم الثابت",
    content: [
      {
        heading: "发展里程碑",
        headingEn: "Milestones",
        headingJa: "発展のマイルストーン",
        headingKo: "발전 이정표",
        headingFr: "Jalons du développement",
        headingAr: "معالم التطور",
        paragraphs: [
          "从标准阀门制造起步，逐步向精密流体控制元件与成套系统解决方案延伸，成长为覆盖六大产品系列、服务全球客户的工业阀门企业。",
        ],
        paragraphsEn: [
          "From standard valve manufacturing to precision fluid control components and turnkey system solutions, growing into an industrial valve enterprise covering six product series serving global customers.",
        ],
        paragraphsJa: [
          "標準バルブ製造から始まり、精密流体制御部品とシステムソリューションへと段階的に事業を拡大し、六大製品シリーズをカバーし世界中の顧客にサービスを提供する工業用バルブ企業へと成長しました。",
        ],
        paragraphsKo: [
          "표준 밸브 제조에서 시작하여 정밀 유체 제어 부품과 시스템 솔루션으로 단계적으로 확장하며, 6대 제품 시리즈를 커버하고 전 세계 고객에게 서비스를 제공하는 산업용 밸브 기업으로 성장했습니다.",
        ],
        paragraphsFr: [
          "De la fabrication de vannes standard aux composants de contrôle de fluide de précision et aux solutions système clé en main, nous sommes devenus une entreprise de vannes industrielles couvrant six séries de produits au service de clients mondiaux.",
        ],
        paragraphsAr: [
          "بدأنا من تصنيع الصمامات القياسية، ثم توسعنا تدريجيًا نحو مكونات التحكم في السوائل الدقيقة وحلول الأنظمة المتكاملة، لنصبح شركة صمامات صناعية تغطي ست سلاسل منتجات وتخدم عملاء عالميين.",
        ],
      },
    ],
    timeline: [
      { year: "2016", title: "公司成立", titleEn: "Company Founded", titleJa: "会社設立", titleKo: "회사 설립", titleFr: "Création de l'entreprise", titleAr: "تأسيس الشركة", desc: "VALTRIX在温州成立，专注工业阀门制造。", descEn: "VALTRIX was founded in Wenzhou, focusing on industrial valve manufacturing.", descJa: "VALTRIXは温州に設立され、工業用バルブ製造に注力しました。", descKo: "VALTRIX는 온주에서 설립되었으며 산업용 밸브 제조에 집중했습니다.", descFr: "VALTRIX a été fondée à Wenzhou, se concentrant sur la fabrication de vannes industrielles.", descAr: "تأسست VALTRIX في ونزو، وتركزت على تصنيع الصمامات الصناعية." },
      { year: "2018", title: "ISO9001 认证", titleEn: "ISO9001 Certified", titleJa: "ISO9001認証取得", titleKo: "ISO9001 인증", titleFr: "Certification ISO9001", titleAr: "شهادة ISO9001", desc: "通过 ISO9001 质量管理体系认证，建立标准化生产流程。", descEn: "Achieved ISO9001 certification and standardized production processes.", descJa: "ISO9001品質マネジメントシステム認証を取得し、標準化された生産プロセスを構築しました。", descKo: "ISO9001 품질경영시스템 인증을 획득하고 표준화된 생산 프로세스를 구축했습니다.", descFr: "Certification ISO9001 du système de management de la qualité et normalisation des processus de production.", descAr: "حصلنا على شهادة ISO9001 لإدارة الجودة وأنشأنا عمليات إنتاج موحدة." },
      { year: "2020", title: "产品线扩展", titleEn: "Product Line Expansion", titleJa: "製品ライン拡充", titleKo: "제품 라인 확장", titleFr: "Extension de la gamme", titleAr: "توسيع خط الإنتاج", desc: "新增安全阀、调节阀系列，产品覆盖六大阀门品类。", descEn: "Added safety and regulating valve series, covering six valve categories.", descJa: "安全弁・調整弁シリーズを追加し、六大バルブカテゴリーをカバーしました。", descKo: "안전밸브, 조절밸브 시리즈를 추가하여 6대 밸브 카테고리를 커버했습니다.", descFr: "Ajout des séries de vannes de sécurité et de régulation, couvrant six catégories de vannes.", descAr: "أضفنا سلاسل صمامات الأمان والتنظيم، لتغطي ست فئات من الصمامات." },
      { year: "2022", title: "出口拓展", titleEn: "Export Expansion", titleJa: "輸出拡大", titleKo: "수출 확대", titleFr: "Expansion des exportations", titleAr: "توسيع الصادرات", desc: "产品出口至 30 多个国家和地区，服务海外工业项目。", descEn: "Products exported to 30+ countries and regions for overseas industrial projects.", descJa: "製品を30以上の国と地域に輸出し、海外の工業プロジェクトにサービスを提供しています。", descKo: "제품을 30개 이상의 국가와 지역에 수출하여 해외 산업 프로젝트에 서비스를 제공하고 있습니다.", descFr: "Produits exportés vers plus de 30 pays et régions pour des projets industriels à l'étranger.", descAr: "تم تصدير المنتجات إلى أكثر من 30 دولة ومنطقة لخدمة المشاريع الصناعية في الخارج." },
      { year: "2024", title: "智能化升级", titleEn: "Smart Manufacturing Upgrade", titleJa: "スマート製造アップグレード", titleKo: "스마트 제조 고도화", titleFr: "Mise à niveau intelligente", titleAr: "الترقية الذكية", desc: "建成数字化生产管理系统与全流程质量追溯体系。", descEn: "Launched digital production management and full-process quality traceability.", descJa: "デジタル生産管理システムと全プロセス品質トレーサビリティ体系を構築しました。", descKo: "디지털 생산관리 시스템과 전 공정 품질 추적体系를 구축했습니다.", descFr: "Mise en place d'une gestion de production numérique et d'une traçabilité qualité de bout en bout.", descAr: "أنشأنا نظام إنتاج رقمي وإدارة جودة شاملة للتتبع عبر كامل العمليات." },
    ],
  },
  {
    slug: "honors",
    title: "资质荣誉",
    titleEn: "Qualifications & Honors",
    titleJa: "資格・栄誉",
    titleKo: "자격 및 영예",
    titleFr: "Qualifications et honneurs",
    titleAr: "المؤهلات والشهادات",
    subtitle: "权威认证，品质保障",
    subtitleEn: "Authoritative certifications, quality assurance",
    subtitleJa: "権威ある認証、品質保証",
    subtitleKo: "권위 있는 인증, 품질 보장",
    subtitleFr: "Certifications faisant autorité, assurance qualité",
    subtitleAr: "شهادات موثوقة، ضمان الجودة",
    content: [
      {
        heading: "认证与资质",
        headingEn: "Certifications",
        paragraphs: [
          "公司产品与质量管理体系通过多项国内外权威认证，为全球客户提供可靠的品质保障。",
        ],
        paragraphsEn: [
          "Our products and quality management system have passed multiple authoritative domestic and international certifications, providing reliable quality assurance for global customers.",
        ],
      },
    ],
    certifications: [
      { name: "ISO9001 质量管理体系", nameEn: "ISO9001 Quality Management System", issuer: "认证机构", issuerEn: "Certification Body", year: "2018" },
      { name: "CE 欧盟安全认证", nameEn: "CE European Safety Certification", issuer: "认证机构", issuerEn: "Certification Body", year: "2020" },
      { name: "特种设备制造许可（压力管道元件）", nameEn: "Special Equipment Manufacturing License (Pressure Pipe Components)", issuer: "市场监督管理部门", issuerEn: "Market Supervision Authority", year: "2021" },
      { name: "API 6D 管线阀门认证", nameEn: "API 6D Pipeline Valve Certification", issuer: "美国石油学会", issuerEn: "American Petroleum Institute", year: "2022" },
    ],
  },
];

export function getAboutSection(slug: string): AboutSection | undefined {
  return aboutSections.find((s) => s.slug === slug);
}

export function getAllAboutSlugs(): string[] {
  return aboutSections.map((s) => s.slug);
}
