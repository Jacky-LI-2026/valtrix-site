// VALTRIX i18n 修复：清除 config/i18n.ts 中的左文科技/MPCVD/金刚石残留，替换为 VALTRIX 阀门定位文案（6 语种）
// 并重命名 5 个含 MPCVD 的 key（mpcvdService→valtrixService 等）
const fs = require("fs");
const path = "config/i18n.ts";
let c = fs.readFileSync(path, "utf8");

// 每个 key：按文件出现顺序 [zh, en, ja, ko, fr, ar]
const MAP = {
  heroTitle1: [
    "超高纯",
    "Ultra-High Purity",
    "超高純度",
    "초고순도",
    "Ultra-haute Pureté",
    "فائقة النقاء",
  ],
  heroTitle2: [
    "流体控制",
    "Fluid Control",
    "流体制御",
    "유체 제어",
    "Contrôle des Fluides",
    "التحكم في السوائل",
  ],
  heroDesc: [
    "VALTRIX 专注半导体超高纯管阀件领域，自主研发并制造隔膜阀、减压阀、过滤器、VCR接头等超高纯流体控制产品，为半导体、生物医药、光伏、氢能等行业提供超高纯流体系统解决方案。",
    "VALTRIX specializes in ultra-high purity (UHP) valves and fittings for the semiconductor industry. We independently develop and manufacture diaphragm valves, pressure regulators, filters and VCR fittings, delivering UHP fluid system solutions for semiconductor, biopharmaceutical, solar and hydrogen energy industries.",
    "VALTRIXは半導体向け超高純度バルブ・継手に特化し、ダイヤフラムバルブ、減圧レギュレーター、フィルター、VCR継手などを自社開発・製造。半導体、バイオ医薬、太陽光、水素エネルギーなどの業界に超高純度流体システムソリューションを提供します。",
    "VALTRIX는 반도체용 초고순도 밸브·피팅 전문 기업으로, 다이어프램 밸브, 감압 레귤레이터, 필터, VCR 피팅 등을 자체 개발·제조하여 반도체, 바이오의약, 태양광, 수소에너지 산업에 초고순도 유체 시스템 솔루션을 제공합니다.",
    "VALTRIX est spécialisé dans les vannes et raccords ultra-haute pureté (UHP) pour semi-conducteurs. Nous concevons et fabriquons des vannes à membrane, des détendeurs, des filtres et des raccords VCR, offrant des solutions UHP pour les secteurs des semi-conducteurs, de la biopharmacie, du solaire et de l'hydrogène.",
    "تتخصص VALTRIX في الصمامات والوصلات فائقة النقاء (UHP) لصناعة أشباه الموصلات. نقوم بتطوير وتصنيع صمامات الحجاب الحاجز ومنظمات الضغط والمرشحات ووصلات VCR، ونقدم حلول أنظمة السوائل فائقة النقاء لصناعات أشباه الموصلات والأدوية الحيوية والطاقة الشمسية والهيدروجين.",
  ],
  heroDesc2: [
    "掌握超高纯流体控制核心技术，从超高纯材料、精密加工到洁净装配全流程自主可控，万级洁净车间生产，产品通过氦检漏测试，满足半导体级纯度与泄漏率要求。",
    "Mastering core UHP fluid control technologies with full in-house control from UHP materials and precision machining to cleanroom assembly. Manufactured in Class 10K cleanrooms and helium leak tested to meet semiconductor-grade purity and leak-rate requirements.",
    "超高純度流体制御のコア技術を掌握し、超高純度材料から精密加工、クリーン組立まで全工程を自社管理。クラス10000クリーンルームで生産し、ヘリウムリークテストにより半導体グレードの純度・漏れ率要件を満たします。",
    "초고순도 유체 제어 핵심 기술을 보유하고 초고순도 소재부터 정밀 가공, 클린 조립까지 전 공정을 자체 관리합니다. 클래스 10,000 클린룸에서 생산하고 헬륨 누설 검사를 통해 반도체급 순도 및 누설률 요건을 충족합니다.",
    "Maîtrisant les technologies clés du contrôle fluidique UHP, avec un contrôle total de la chaîne — matériaux UHP, usinage de précision et assemblage en salle blanche. Fabriqué en salle blanche classe 10 000 et testé à l'hélium pour répondre aux exigences de pureté et de fuite de grade semi-conducteur.",
    "نمتلك تقنيات التحكم في السوائل فائقة النقاء الأساسية، مع تحكم كامل في سلسلة الإنتاج من المواد فائقة النقاء إلى التصنيع الدقيق والتجميع النظيف. تُصنع منتجاتنا في غرف نظيفة من الفئة 10000 وتخضع لاختبار تسرب الهيليوم لتلبية متطلبات النقاء ومعدل التسرب بدرجة أشباه الموصلات.",
  ],
  coreAdvantagesDesc: [
    "超高纯材料与精密制造技术，为客户提供可靠的超高纯流体控制解决方案",
    "UHP materials and precision manufacturing, delivering reliable ultra-high purity fluid control solutions",
    "超高純度材料と精密加工技術により、信頼性の高い超高純度流体制御ソリューションを提供します",
    "초고순도 소재와 정밀 가공 기술로 신뢰할 수 있는 초고순도 유체 제어 솔루션을 제공합니다",
    "Matériaux UHP et fabrication de précision, pour des solutions fiables de contrôle fluidique ultra-haute pureté",
    "مواد فائقة النقاء وتصنيع دقيق، لتقديم حلول موثوقة للتحكم في السوائل فائقة النقاء",
  ],
  productCenterDesc: [
    "围绕超高纯流体控制核心，提供隔膜阀、减压阀、过滤器、VCR接头等全系列超高纯管阀件产品",
    "A full range of UHP valves and fittings — diaphragm valves, pressure regulators, filters, VCR fittings — built around UHP fluid control",
    "超高純度流体制御を中心に、ダイヤフラムバルブ、減圧レギュレーター、フィルター、VCR継手など全シリーズの超高純度バルブ・継手を提供します",
    "초고순도 유체 제어를 중심으로 다이어프램 밸브, 감압 레귤레이터, 필터, VCR 피팅 등 전 시리즈의 초고순도 밸브·피팅을 제공합니다",
    "Une gamme complète de vannes et raccords UHP — vannes à membrane, détendeurs, filtres, raccords VCR — autour du contrôle fluidique UHP",
    "مجموعة كاملة من الصمامات والوصلات فائقة النقاء — صمامات الحجاب الحاجز ومنظمات الضغط والمرشحات ووصلات VCR — مبنية حول التحكم في السوائل فائقة النقاء",
  ],
  industryApplicationsDesc: [
    "超高纯管阀件广泛应用于半导体、生物医药、光伏、氢能等多个高端制造领域",
    "UHP valves and fittings widely used in semiconductor, biopharmaceutical, solar, hydrogen and other high-tech industries",
    "超高純度バルブ・継手は半導体、バイオ医薬、太陽光、水素など多くのハイテク分野で広く採用されています",
    "초고순도 밸브·피팅은 반도체, 바이오의약, 태양광, 수소 등 여러 첨단 산업 분야에 널리 사용됩니다",
    "Vannes et raccords UHP largement utilisés dans les semi-conducteurs, la biopharmacie, le solaire, l'hydrogène et d'autres secteurs de haute technologie",
    "تُستخدم الصمامات والوصلات فائقة النقاء على نطاق واسع في أشباه الموصلات والأدوية الحيوية والطاقة الشمسية والهيدروجين وغيرها من الصناعات عالية التقنية",
  ],
  ourSolutions: [
    "VALTRIX 解决方案",
    "VALTRIX Solutions",
    "VALTRIXソリューション",
    "VALTRIX 솔루션",
    "Solutions VALTRIX",
    "حلول VALTRIX",
  ],
  ourSolutionsDesc: [
    "针对行业特点，提供专业的超高纯管阀件与流体系统解决方案",
    "Professional UHP valves, fittings and fluid system solutions tailored to each industry",
    "業界の特性に応じた専門的な超高純度バルブ・継手と流体システムソリューションを提供します",
    "업종 특성에 맞춘 전문적인 초고순도 밸브·피팅 및 유체 시스템 솔루션을 제공합니다",
    "Des solutions professionnelles de vannes, raccords UHP et systèmes fluidiques adaptées à chaque secteur",
    "حلول احترافية للصمامات والوصلات وأنظمة السوائل فائقة النقاء مصممة حسب خصائص كل قطاع",
  ],
  mpcvdService: [
    "超高纯阀件服务",
    "UHP Valve & Fitting Services",
    "超高純度バルブ・継手サービス",
    "초고순도 밸브·피팅 서비스",
    "Services vannes et raccords UHP",
    "خدمات الصمامات والوصلات فائقة النقاء",
  ],
  aboutUsDesc: [
    "专注半导体超高纯管阀件研发、生产与服务的科技型企业",
    "A technology company focused on R&D, manufacturing and service of UHP valves and fittings for semiconductors",
    "半導体向け超高純度バルブ・継手の研究開発・生産・サービスに特化したテクノロジー企業",
    "반도체용 초고순도 밸브·피팅 연구개발·생산·서비스에 특화된 기술 기업",
    "Une entreprise technologique spécialisée dans la R&D, la fabrication et le service de vannes et raccords UHP pour semi-conducteurs",
    "شركة تقنية متخصصة في البحث والتطوير والتصنيع وخدمات الصمامات والوصلات فائقة النقاء لأشباه الموصلات",
  ],
  newsDesc: [
    "了解 VALTRIX 最新动态和行业资讯",
    "Stay updated with VALTRIX news and industry insights",
    "VALTRIXの最新情報と業界ニュースをご覧ください",
    "VALTRIX의 최신 소식과 업계 정보를 확인하세요",
    "Restez informé des actualités VALTRIX et des tendances du secteur",
    "اطّلع على آخر أخبار VALTRIX ومستجدات القطاع",
  ],
  ctaTitle: [
    "准备好开启您的超高纯流体项目了吗？",
    "Ready to Start Your UHP Fluid Project?",
    "超高純度流体プロジェクトを始める準備はできていますか？",
    "초고순도 유체 프로젝트를 시작할 준비가 되셨습니까?",
    "Prêt à lancer votre projet de fluides UHP ?",
    "هل أنت مستعد لبدء مشروع السوائل فائقة النقاء؟",
  ],
  ctaDesc: [
    "无论您需要隔膜阀、减压阀、过滤器还是 VCR 接头，VALTRIX 专业团队随时为您服务。立即联系我们，获取专属解决方案。",
    "Whether you need diaphragm valves, pressure regulators, filters or VCR fittings, the VALTRIX team is ready to help. Contact us for tailored solutions.",
    "ダイヤフラムバルブ、減圧レギュレーター、フィルター、VCR継手など、VALTRIXの専門チームがいつでもサポートします。今すぐお問い合わせください。",
    "다이어프램 밸브, 감압 레귤레이터, 필터, VCR 피팅 등 무엇이든 VALTRIX 전문 팀이 도와드립니다. 지금 문의하여 맞춤 솔루션을 받아보세요.",
    "Que vous ayez besoin de vannes à membrane, de détendeurs, de filtres ou de raccords VCR, l'équipe VALTRIX est prête à vous aider. Contactez-nous pour des solutions sur mesure.",
    "سواء كنت بحاجة إلى صمامات الحجاب الحاجز أو منظمات الضغط أو المرشحات أو وصلات VCR، فإن فريق VALTRIX جاهز لمساعدتك. تواصل معنا للحصول على حلول مخصصة.",
  ],
  footerDesc: [
    "VALTRIX 专注半导体超高纯管阀件与流体系统解决方案，为半导体、生物医药、光伏、氢能及科研实验室等领域提供可靠的产品与服务。",
    "VALTRIX specializes in UHP valves, fittings and fluid system solutions for semiconductors, providing reliable products and services for biopharmaceutical, solar, hydrogen energy and research laboratory sectors.",
    "VALTRIXは半導体向け超高純度バルブ・継手と流体システムソリューションに特化し、バイオ医薬、太陽光、水素エネルギー、研究ラボなどの分野に信頼できる製品とサービスを提供します。",
    "VALTRIX는 반도체용 초고순도 밸브·피팅 및 유체 시스템 솔루션 전문 기업으로, 바이오의약, 태양광, 수소에너지, 연구소 등 분야에 신뢰할 수 있는 제품과 서비스를 제공합니다.",
    "VALTRIX est spécialisé dans les vannes, raccords UHP et solutions de systèmes fluidiques pour semi-conducteurs, offrant des produits et services fiables pour la biopharmacie, le solaire, l'hydrogène et les laboratoires de recherche.",
    "تتخصص VALTRIX في الصمامات والوصلات فائقة النقاء وحلول أنظمة السوائل لأشباه الموصلات، وتوفر منتجات وخدمات موثوقة لقطاعات الأدوية الحيوية والطاقة الشمسية والهيدروجين والمختبرات البحثية.",
  ],
  aboutFooter: [
    "关于 VALTRIX",
    "About VALTRIX",
    "VALTRIXについて",
    "VALTRIX 소개",
    "À propos de VALTRIX",
    "حول VALTRIX",
  ],
  contactAboutInfo: [
    "联系我们获取更多关于 VALTRIX 的信息",
    "Contact us for more information about VALTRIX",
    "VALTRIXの詳細については、お問い合わせください",
    "VALTRIX에 대한 자세한 내용은 문의해 주세요",
    "Contactez-nous pour plus d'informations sur VALTRIX",
    "تواصل معنا للحصول على مزيد من المعلومات حول VALTRIX",
  ],
  whyJoin: [
    "为什么加入 VALTRIX",
    "Why Join VALTRIX",
    "VALTRIXに入社する理由",
    "VALTRIX에 합류해야 하는 이유",
    "Pourquoi rejoindre VALTRIX",
    "لماذا تنضم إلى VALTRIX",
  ],
  tailoredSolutionDesc: [
    "为您的行业需求量身定制的超高纯流体技术解决方案",
    "Tailored UHP fluid technology solutions for your industry needs",
    "お客様の業界ニーズに合わせてカスタマイズした超高純度流体技術ソリューション",
    "귀사의 업계 요구에 맞춘 초고순도 유체 기술 솔루션",
    "Des solutions technologiques fluidiques UHP adaptées aux besoins de votre secteur",
    "حلول تقنية فائقة النقاء للسوائل مصممة خصيصًا لاحتياجات قطاعك",
  ],
  searchServiceMpcvd: [
    "超高纯管阀件",
    "UHP Valves & Fittings",
    "超高純度バルブ・継手",
    "초고순도 밸브·피팅",
    "Vannes et raccords UHP",
    "صمامات ووصلات فائقة النقاء",
  ],
  searchServiceMpcvdDesc: [
    "超高纯气路系统配套",
    "UHP gas line system integration",
    "超高純度ガスラインシステム構築",
    "초고순도 가스 라인 시스템 구축",
    "Intégration de systèmes de lignes de gaz UHP",
    "تجهيز أنظمة خطوط الغاز فائقة النقاء",
  ],
  inquiryMpcvd: [
    "超高纯管阀件",
    "UHP Valves & Fittings",
    "超高純度バルブ・継手",
    "초고순도 밸브·피팅",
    "Vannes et raccords UHP",
    "صمامات ووصلات فائقة النقاء",
  ],
  mpcvdEquipment: [
    "超高纯管阀件",
    "UHP Valves & Fittings",
    "超高純度バルブ・継手",
    "초고순도 밸브·피팅",
    "Vannes et raccords UHP",
    "صمامات ووصلات فائقة النقاء",
  ],
  aboutTitle: [
    "关于 VALTRIX",
    "About VALTRIX",
    "VALTRIXについて",
    "VALTRIX 소개",
    "À propos de VALTRIX",
    "حول VALTRIX",
  ],
  aboutDesc1: [
    "VALTRIX 是专注于半导体行业超高纯管阀件研发、生产与服务的品牌，产品广泛应用于集成电路、生物医药、光伏、氢能等高端制造领域。",
    "VALTRIX is a brand dedicated to the R&D, manufacturing and service of ultra-high purity valves and fittings for the semiconductor industry, widely used in IC, biopharmaceutical, solar, hydrogen and other high-end manufacturing fields.",
    "VALTRIXは半導体業界向け超高純度バルブ・継手の研究開発・生産・サービスに取り組むブランドで、集積回路、バイオ医薬、太陽光、水素など幅広いハイエンド製造分野で採用されています。",
    "VALTRIX는 반도체 산업용 초고순도 밸브·피팅의 연구개발, 생산, 서비스에 전념하는 브랜드로, 집적회로, 바이오의약, 태양광, 수소 등 고급 제조 분야에 널리 사용됩니다.",
    "VALTRIX est une marque dédiée à la R&D, la fabrication et le service de vannes et raccords ultra-haute pureté pour l'industrie des semi-conducteurs, largement utilisés dans les circuits intégrés, la biopharmacie, le solaire, l'hydrogène et d'autres domaines de fabrication haut de gamme.",
    "VALTRIX علامة تجارية مكرسة للبحث والتطوير والتصنيع والخدمات الخاصة بالصمامات والوصلات فائقة النقاء لصناعة أشباه الموصلات، وتُستخدم على نطاق واسع في الدوائر المتكاملة والأدوية الحيوية والطاقة الشمسية والهيدروجين وغيرها من مجالات التصنيع المتقدمة.",
  ],
  aboutDesc2: [
    "产品覆盖隔膜阀、波纹管阀、减压阀、过滤器、VCR 接头等高纯管阀件，采用超高纯材料与精密加工工艺，满足半导体级洁净度与泄漏率要求。",
    "Our products cover diaphragm valves, bellows valves, pressure regulators, filters, VCR fittings and other high-purity components, manufactured with UHP materials and precision processes to meet semiconductor-grade cleanliness and leak-rate requirements.",
    "ダイヤフラムバルブ、ベローズバルブ、減圧レギュレーター、フィルター、VCR継手などの高純度バルブ・継手を提供。超高純度材料と精密加工により半導体グレードの清浄度・漏れ率要件を満たします。",
    "다이어프램 밸브, 벨로우즈 밸브, 감압 레귤레이터, 필터, VCR 피팅 등 고순도 밸브·피팅을 생산하며, 초고순도 소재와 정밀 가공 공정으로 반도체급 청정도와 누설률 요건을 충족합니다.",
    "Nos produits couvrent vannes à membrane, vannes à soufflet, détendeurs, filtres, raccords VCR et autres composants haute pureté, fabriqués avec des matériaux UHP et des procédés de précision répondant aux exigences de propreté et de taux de fuite de grade semi-conducteur.",
    "تغطي منتجاتنا صمامات الحجاب الحاجز وصمامات المنفاخ ومنظمات الضغط والمرشحات ووصلات VCR وغيرها من المكونات عالية النقاء، المصنعة بمواد فائقة النقاء وعمليات دقيقة لتلبية متطلبات النظافة ومعدل التسرب بدرجة أشباه الموصلات.",
  ],
  feature1: [
    "超高纯材料",
    "UHP Materials",
    "超高純度材料",
    "초고순도 소재",
    "Matériaux UHP",
    "مواد فائقة النقاء",
  ],
  feature2: [
    "精密制造",
    "Precision Manufacturing",
    "精密加工",
    "정밀 가공",
    "Fabrication de précision",
    "تصنيع دقيق",
  ],
  feature3: [
    "洁净包装",
    "Cleanroom Packaging",
    "クリーン梱包",
    "클린 포장",
    "Emballage en salle blanche",
    "تغليف نظيف",
  ],
  feature4: [
    "快速交付",
    "Fast Delivery",
    "迅速な納品",
    "신속한 납품",
    "Livraison rapide",
    "تسليم سريع",
  ],
  productsPageSubtitle: [
    "覆盖隔膜阀、减压阀、过滤器、VCR接头等超高纯管阀件产品体系，提供超高纯流体系统解决方案",
    "Featuring diaphragm valves, pressure regulators, filters, VCR fittings and other UHP valves and fittings, delivering complete UHP fluid system solutions",
    "ダイヤフラムバルブ、減圧レギュレーター、フィルター、VCR継手などの超高純度バルブ・継手製品体系を網羅し、超高純度流体システムソリューションを提供します",
    "다이어프램 밸브, 감압 레귤레이터, 필터, VCR 피팅 등 초고순도 밸브·피팅 제품 체계를 아우르며 초고순도 유체 시스템 솔루션을 제공합니다",
    "Une gamme complète de vannes et raccords UHP — vannes à membrane, détendeurs, filtres, raccords VCR — avec des solutions de systèmes fluidiques UHP",
    "تشمل مجموعتنا صمامات الحجاب الحاجز ومنظمات الضغط والمرشحات ووصلات VCR وغيرها من الصمامات والوصلات فائقة النقاء، مع توفير حلول أنظمة السوائل فائقة النقاء",
  ],
  careersPageSubtitle: [
    "VALTRIX 期待与优秀的您一起，推动超高纯流体控制技术的发展",
    "VALTRIX looks forward to working with outstanding talents like you to advance UHP fluid control technology",
    "VALTRIXは優秀なあなたとともに、超高純度流体制御技術の発展を推進することを期待しています",
    "VALTRIX는 우수한 인재와 함께 초고순도 유체 제어 기술 발전을 추진하기를 기대합니다",
    "VALTRIX souhaite faire progresser les technologies de contrôle fluidique UHP avec des talents comme vous",
    "تتطلع VALTRIX إلى العمل مع المواهب المتميزة مثلكم لتطوير تقنيات التحكم في السوائل فائقة النقاء",
  ],
  industriesPageSubtitle: [
    "VALTRIX 超高纯管阀件广泛应用于半导体、生物医药、LED显示、光伏、氢能、科研实验室等领域",
    "VALTRIX UHP valves and fittings are widely used in semiconductor, biopharmaceutical, LED display, solar photovoltaic, hydrogen energy and research laboratory sectors",
    "VALTRIXの超高純度バルブ・継手は、半導体、バイオ医薬、LEDディスプレイ、太陽光発電、水素エネルギー、研究ラボなどで広く採用されています",
    "VALTRIX 초고순도 밸브·피팅은 반도체, 바이오의약, LED 디스플레이, 태양광, 수소에너지, 연구소 등 분야에 널리 사용됩니다",
    "Les vannes et raccords UHP VALTRIX sont largement utilisés dans les semi-conducteurs, la biopharmacie, l'affichage LED, le photovoltaïque, l'hydrogène et les laboratoires de recherche",
    "تُستخدم صمامات ووصلات VALTRIX فائقة النقاء على نطاق واسع في أشباه الموصلات والأدوية الحيوية وشاشات LED والطاقة الشمسية الكهروضوئية والهيدروجين والمختبرات البحثية",
  ],
  newsPageSubtitle: [
    "了解 VALTRIX 的最新动态、产品发布和技术文章",
    "Stay up to date with VALTRIX's latest news, product launches and technical articles",
    "VALTRIXの最新ニュース、製品発表、技術記事をご覧いただけます",
    "VALTRIX의 최신 소식, 제품 출시, 기술 기사를 확인하세요",
    "Découvrez les dernières actualités, lancements de produits et articles techniques de VALTRIX",
    "اطّلع على آخر أخبار VALTRIX وإطلاقات المنتجات والمقالات التقنية",
  ],
};

// key 重命名（值替换完成后执行）
const RENAME = {
  mpcvdService: "valtrixService",
  mpcvdEquipment: "valtrixEquipment",
  searchServiceMpcvd: "searchServiceUhp",
  searchServiceMpcvdDesc: "searchServiceUhpDesc",
  inquiryMpcvd: "inquiryUhp",
};

let replaced = 0;
for (const [key, values] of Object.entries(MAP)) {
  let cursor = 0;
  for (let i = 0; i < values.length; i++) {
    const re = new RegExp("(" + key + ":\\s*\")[^\"]*(\")");
    const next = c.indexOf(key + ":", cursor);
    if (next === -1) { console.log("MISS", key, "occurrence", i); break; }
    const before = c.slice(0, next);
    const after = c.slice(next);
    const m = after.match(re);
    if (!m) { console.log("NO MATCH", key, i); break; }
    c = before + m[1] + values[i] + m[2] + after.slice(m[0].length);
    cursor = next + m[0].length;
    replaced++;
  }
}

let renamed = 0;
for (const [oldKey, newKey] of Object.entries(RENAME)) {
  const count = c.split(oldKey + ":").length - 1;
  c = c.split(oldKey + ":").join(newKey + ":");
  renamed += count;
  console.log("RENAME", oldKey, "->", newKey, "x", count);
}

fs.writeFileSync(path, c);
console.log("replaced", replaced, "values; renamed", renamed);
