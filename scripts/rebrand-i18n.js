// 替换 config/i18n.ts 品牌与行业文案（左文/金刚石 → 晧固阀门/精密流体元件），6 语种
const fs = require("fs");
const path = "config/i18n.ts";
let c = fs.readFileSync(path, "utf8");

// 每个 key：按文件出现顺序 [zh, en, ja, ko, fr, ar]
const MAP = {
  heroDesc: [
    "晧固阀门专注精密流体控制元件研发与制造，产品涵盖球阀、针阀、单向阀、隔膜阀、减压阀及卡套管接头、过滤器、软管等，为半导体、石油化工、氢能与分析仪器等行业提供高品质流体系统解决方案。",
    "HAOGU VALVE specializes in R&D and manufacturing of precision fluid control components, covering ball valves, needle valves, check valves, diaphragm valves, pressure regulators, tube fittings, filters and hoses for semiconductor, petrochemical, hydrogen energy and analytical instrumentation industries.",
    "晧固バルブは精密流体制御部品の研究開発・製造に特化し、ボールバルブ、ニードルバルブ、逆止弁、ダイヤフラムバルブ、減圧弁、チューブ継手、フィルター、ホースなどを半導体、石油化学、水素エネルギー、分析機器などの業界に提供しています。",
    "하오구밸브는 정밀 유체 제어 부품 연구개발 및 제조에 특화되어 있으며, 볼 밸브, 니들 밸브, 체크 밸브, 다이어프램 밸브, 감압 밸브, 튜브 피팅, 필터, 호스 등을 반도체, 석유화학, 수소에너지, 분석기기 산업에 공급합니다.",
    "HAOGU VALVE se spécialise dans la R&D et la fabrication de composants de contrôle de fluides de précision, couvrant vannes à bille, vannes à pointeau, clapets antiretour, vannes à membrane, détendeurs, raccords à bague, filtres et tuyaux pour les industries des semi-conducteurs, de la pétrochimie, de l'hydrogène et de l'instrumentation analytique.",
    "تتخصص هاوجو للصمامات في البحث والتطوير وتصنيع مكونات التحكم في السوائل الدقيقة، بما في ذلك الصمامات الكروية وصمامات الإبرة وصمامات عدم الرجوع وصمامات الحجاب الحاجز ومنظمات الضغط ووصلات الأنابيب والمرشحات والخراطيم لصناعات أشباه الموصلات والبتروكيماويات والهيدروجين والأجهزة التحليلية.",
  ],
  heroDesc2: [
    "对标国际一流流体元件标准，采用316L不锈钢与特殊合金材质，全系列产品经氦检漏与压力循环测试，确保高纯、耐腐蚀、长寿命的可靠性能。",
    "Built to international standards with 316L stainless steel and specialty alloys, all products pass helium leak testing and pressure cycling to ensure high purity, corrosion resistance and long service life.",
    "国際一流の流体部品規格に準拠し、316Lステンレス鋼と特殊合金を使用。全製品がヘリウムリークテストと圧力サイクル試験に合格し、高純度・耐腐食・長寿命の信頼性を確保しています。",
    "국제 일류 유체 부품 규격에 부합하며 316L 스테인리스강과 특수 합금을 사용합니다. 전 제품이 헬륨 누설 검사와 압력 사이클 시험을 통과하여 고순도, 내부식, 장수명의 신뢰성을 보장합니다.",
    "Construit selon les normes internationales avec de l'acier inoxydable 316L et des alliages spéciaux, tous les produits passent des tests d'étanchéité à l'hélium et de cyclage de pression pour garantir haute pureté, résistance à la corrosion et longue durée de vie.",
    "مصنوعة وفق المعايير الدولية من الفولاذ المقاوم للصدأ 316L والسبائك الخاصة، وتجتاز جميع المنتجات اختبارات تسرب الهيليوم ودورات الضغط لضمان النقاء العالي ومقاومة التآكل وعمر الخدمة الطويل.",
  ],
  heroDesc3: [
    "产品广泛应用于半导体、石油天然气、化工制药、氢能源与分析仪器等高端领域，服务于全球领先的制造与科研客户。",
    "Products serve semiconductor, oil & gas, chemical, pharmaceutical, hydrogen and analytical sectors, trusted by world-leading manufacturers and research institutions.",
    "製品は半導体、石油・ガス、化学・製薬、水素エネルギー、分析機器などのハイエンド分野で広く使用され、世界有数のメーカーと研究機関に信頼されています。",
    "제품은 반도체, 석유가스, 화학제약, 수소에너지, 분석기기 등 하이엔드 분야에서 널리 사용되며 세계 최고의 제조사와 연구기관의 신뢰를 받고 있습니다.",
    "Les produits servent les secteurs des semi-conducteurs, du pétrole et du gaz, de la chimie et de la pharmacie, de l'hydrogène et de l'analyse, appréciés par les fabricants et instituts de recherche de premier plan.",
    "تخدم المنتجات قطاعات أشباه الموصلات والنفط والغاز والكيماويات والأدوية والهيدروجين والأجهزة التحليلية، وتحظى بثقة كبار المصنعين والمؤسسات البحثية العالمية.",
  ],
  coreAdvantagesDesc: [
    "对标国际一流标准研发制造，为客户提供可靠的精密流体控制元件与系统解决方案",
    "R&D and manufacturing to international standards, providing reliable precision fluid control components and system solutions",
    "国際一流の基準で研究開発・製造し、信頼性の高い精密流体制御部品とシステムソリューションを提供",
    "국제 일류 기준으로 연구개발·제조하며 신뢰할 수 있는 정밀 유체 제어 부품 및 시스템 솔루션을 제공합니다",
    "R&D et fabrication selon les normes internationales, fournissant des composants et solutions fiables de contrôle de fluides de précision",
    "بحث وتطوير وتصنيع وفق المعايير الدولية، وتوفير مكونات وحلول موثوقة للتحكم الدقيق في السوائل",
  ],
  productCenterDesc: [
    "围绕精密流体控制核心需求，提供阀门、接头、过滤器与管路系统全系列产品",
    "Focused on precision fluid control needs, offering full series of valves, fittings, filters and tubing systems",
    "精密流体制御のニーズに応え、バルブ、継手、フィルター、配管システムの全シリーズを提供",
    "정밀 유체 제어 요구에 대응하여 밸브, 피팅, 필터, 배관 시스템 전 시리즈를 제공합니다",
    "Axé sur les besoins de contrôle de fluides de précision, offrant toute la gamme de vannes, raccords, filtres et systèmes de tuyauterie",
    "متخصص في تلبية احتياجات التحكم الدقيق في السوائل، ويقدم جميع سلاسل الصمامات والوصلات والمرشحات وأنظمة الأنابيب",
  ],
  industryApplicationsDesc: [
    "精密流体元件广泛应用于半导体、石化、氢能、制药等多个高端领域",
    "Precision fluid components widely applied in semiconductor, petrochemical, hydrogen, pharmaceutical and other high-end industries",
    "精密流体部品は半導体、石油化学、水素、製薬などのハイエンド分野で広く応用",
    "정밀 유체 부품은 반도체, 석유화학, 수소, 제약 등 하이엔드 분야에 널리 응용됩니다",
    "Composants de fluides de précision largement appliqués dans les semi-conducteurs, la pétrochimie, l'hydrogène et la pharmacie",
    "تطبق مكونات السوائل الدقيقة على نطاق واسع في أشباه الموصلات والبتروكيماويات والهيدروجين والأدوية وغيرها من القطاعات الراقية",
  ],
  ourSolutions: [
    "晧固阀门解决方案",
    "HAOGU VALVE Solutions",
    "晧固バルブソリューション",
    "하오구밸브 솔루션",
    "Solutions HAOGU VALVE",
    "حلول هاوجو للصمامات",
  ],
  ourSolutionsDesc: [
    "针对该领域流体系统的特点，提供专业的阀门、接头与管路元件解决方案",
    "Professional valve, fitting and fluid system solutions tailored to this industry",
    "当該分野の流体システム特性に合わせ、専門的なバルブ・継手・配管部品ソリューションを提供",
    "이 분야 유체 시스템의 특성에 맞춘 전문 밸브·피팅·배관 부품 솔루션을 제공합니다",
    "Solutions professionnelles de vannes, raccords et composants de tuyauterie adaptées à ce secteur",
    "حلول احترافية للصمامات والوصلات ومكونات الأنابيب مصممة حسب خصائص هذا القطاع",
  ],
  aboutUsDesc: [
    "专注精密阀门与流体系统元件研发、制造与服务的科技型企业",
    "A technology enterprise focused on R&D, manufacturing and service of precision valves and fluid system components",
    "精密バルブと流体システム部品の研究開発・製造・サービスに特化したテクノロジー企業",
    "정밀 밸브와 유체 시스템 부품 연구개발·제조·서비스에 특화된 기술 기업",
    "Entreprise technologique spécialisée dans la R&D, la fabrication et le service de vannes et composants de systèmes fluidiques de précision",
    "شركة تقنية متخصصة في البحث والتطوير والتصنيع وخدمات الصمامات الدقيقة ومكونات أنظمة السوائل",
  ],
  ctaTitle: [
    "准备好启动您的流体系统项目了吗？",
    "Ready to start your fluid system project?",
    "流体システムプロジェクトを始める準備はできましたか？",
    "유체 시스템 프로젝트를 시작할 준비가 되셨나요?",
    "Prêt à lancer votre projet de système fluidique ?",
    "هل أنت مستعد لبدء مشروع نظام السوائل الخاص بك؟",
  ],
  ctaDesc: [
    "无论您需要精密球阀、针阀还是完整的流体系统元件，晧固阀门专业团队随时为您服务。立即联系我们，获取专属解决方案。",
    "Whether you need precision ball valves, needle valves or complete fluid system components, the HAOGU VALVE team is ready to help. Contact us for tailored solutions.",
    "精密ボールバルブ、ニードルバルブ、または完全な流体システム部品が必要な場合も、晧固バルブの専門チームがいつでもサポートします。今すぐお問い合わせください。",
    "정밀 볼 밸브, 니들 밸브 또는 완전한 유체 시스템 부품이 필요하시든, 하오구밸브 전문 팀이 항상 도와드립니다. 지금 문의하세요.",
    "Que vous ayez besoin de vannes à bille de précision, de vannes à pointeau ou de composants complets de systèmes fluidiques, l'équipe HAOGU VALVE est prête à vous aider. Contactez-nous.",
    "سواء كنت بحاجة إلى صمامات كروية دقيقة أو صمامات إبرة أو مكونات أنظمة سوائل كاملة، فإن فريق هاوجو جاهز لمساعدتك. اتصل بنا اليوم.",
  ],
  footerDesc: [
    "精密流体，可靠之选。晧固阀门专注精密阀门与流体系统元件的研发制造，为半导体、石化、氢能、制药及分析仪器等领域提供可信赖的解决方案。",
    "Precision fluid, reliable choice. HAOGU VALVE specializes in precision valves and fluid system components for semiconductor, petrochemical, hydrogen, pharmaceutical and analytical industries.",
    "精密流体、信頼の選択。晧固バルブは精密バルブと流体システム部品の研究開発・製造に特化し、半導体、石油化学、水素、製薬、分析機器などの分野に信頼できるソリューションを提供します。",
    "정밀 유체, 신뢰의 선택. 하오구밸브는 정밀 밸브와 유체 시스템 부품 연구개발·제조에 특화되어 반도체, 석유화학, 수소, 제약, 분석기기 분야에 신뢰할 수 있는 솔루션을 제공합니다.",
    "Fluide de précision, choix fiable. HAOGU VALVE se spécialise dans les vannes et composants de systèmes fluidiques pour les secteurs des semi-conducteurs, de la pétrochimie, de l'hydrogène, de la pharmacie et de l'analyse.",
    "سوائل دقيقة، خيار موثوق. تتخصص هاوجو في تصنيع الصمامات الدقيقة ومكونات أنظمة السوائل لقطاعات أشباه الموصلات والبتروكيماويات والهيدروجين والأدوية والأجهزة التحليلية.",
  ],
  aboutFooter: [
    "关于晧固",
    "About HAOGU VALVE",
    "晧固について",
    "하오구 정보",
    "À propos de HAOGU VALVE",
    "عن هاوجو",
  ],
  tailoredSolutionDesc: [
    "为您的行业需求量身定制的精密流体解决方案",
    "Precision fluid solutions tailored to your industry needs",
    "お客様の業界ニーズに合わせた精密流体ソリューション",
    "고객의 업계 요구에 맞춘 정밀 유체 솔루션",
    "Solutions de fluides de précision adaptées à vos besoins sectoriels",
    "حلول سوائل دقيقة مصممة حسب احتياجات قطاعك",
  ],
  mpcvdEquipment: [
    "精密流体控制元件",
    "Precision Fluid Control Components",
    "精密流体制御部品",
    "정밀 유체 제어 부품",
    "Composants de contrôle de fluides de précision",
    "مكونات التحكم الدقيق في السوائل",
  ],
  aboutTitle: [
    "关于晧固阀门",
    "About HAOGU VALVE",
    "晧固バルブについて",
    "하오구밸브 소개",
    "À propos de HAOGU VALVE",
    "عن هاوجو للصمامات",
  ],
  aboutDesc1: [
    "晧固VALTRIX Co., Ltd.是一家专注于精密流体控制元件研发、制造与服务的科技型企业，产品对标国际一流标准，广泛应用于高端制造与科研领域。",
    "HAOGU VALTRIXNOLOGY Co., Ltd. is a technology enterprise specializing in R&D, manufacturing and service of precision fluid control components, built to international standards for high-end manufacturing and research.",
    "晧固バルブテクノロジー株式会社は精密流体制御部品の研究開発・製造・サービスに特化したテクノロジー企業です。製品は国際一流の基準に適合し、ハイエンド製造と研究分野で広く使用されています。",
    "하오구밸브테크놀로지 주식회사는 정밀 유체 제어 부품 연구개발·제조·서비스에 특화된 기술 기업입니다. 제품은 국제 일류 기준에 부합하며 하이엔드 제조 및 연구 분야에서 널리 사용됩니다.",
    "HAOGU VALTRIXNOLOGY Co., Ltd. est une entreprise technologique spécialisée dans la R&D, la fabrication et le service de composants de contrôle de fluides de précision, conformes aux normes internationales.",
    "شركة هاوجو لتقنية الصمامات هي شركة تقنية متخصصة في البحث والتطوير والتصنيع وخدمات مكونات التحكم الدقيق في السوائل، وفق المعايير الدولية للتصنيع والبحث المتقدم.",
  ],
  aboutDesc2: [
    "公司产品覆盖精密球阀、针阀、单向阀、隔膜阀、减压阀、卡套管接头、过滤器及软管等，广泛应用于半导体、石油化工、氢能、制药与高端制造等领域。",
    "Products cover precision ball valves, needle valves, check valves, diaphragm valves, pressure regulators, tube fittings, filters and hoses, widely applied in semiconductor, petrochemical, hydrogen, pharmaceutical and high-end manufacturing industries.",
    "製品は精密ボールバルブ、ニードルバルブ、逆止弁、ダイヤフラムバルブ、減圧弁、チューブ継手、フィルター、ホースなどをカバーし、半導体、石油化学、水素、製薬、ハイエンド製造などの分野で広く応用されています。",
    "제품은 정밀 볼 밸브, 니들 밸브, 체크 밸브, 다이어프램 밸브, 감압 밸브, 튜브 피팅, 필터, 호스 등을 포괄하며 반도체, 석유화학, 수소, 제약, 하이엔드 제조 분야에 널리 응용됩니다.",
    "La gamme couvre vannes à bille, à pointeau, clapets antiretour, vannes à membrane, détendeurs, raccords à bague, filtres et tuyaux, pour les semi-conducteurs, la pétrochimie, l'hydrogène, la pharmacie et la fabrication haut de gamme.",
    "تشمل المنتجات الصمامات الكروية الدقيقة وصمامات الإبرة وصمامات عدم الرجوع وصمامات الحجاب الحاجز ومنظمات الضغط ووصلات الأنابيب والمرشحات والخراطيم، وتُستخدم في أشباه الموصلات والبتروكيماويات والهيدروجين والأدوية والتصنيع المتقدم.",
  ],
  feature1: [
    "对标国际一流流体元件标准，精密制造",
    "Precision manufacturing to international fluid component standards",
    "国際一流の流体部品基準に準拠した精密製造",
    "국제 일류 유체 부품 기준에 부합하는 정밀 제조",
    "Fabrication de précision selon les normes internationales de composants fluidiques",
    "تصنيع دقيق وفق المعايير الدولية لمكونات السوائل",
  ],
  feature2: [
    "316L不锈钢与特殊合金材质，氦检漏保障",
    "316L stainless steel and specialty alloys with helium leak testing",
    "316Lステンレス鋼と特殊合金、ヘリウムリークテスト保証",
    "316L 스테인리스강과 특수 합금, 헬륨 누설 검사 보장",
    "Acier inoxydable 316L et alliages spéciaux avec test d'étanchéité à l'hélium",
    "فولاذ 316L مقاوم للصدأ وسبائك خاصة مع اختبار تسرب الهيليوم",
  ],
  feature3: [
    "全系列阀门通过压力循环与气密双重测试",
    "Full series pass pressure cycling and air-tightness dual testing",
    "全シリーズバルブが圧力サイクルと気密性の二重テストに合格",
    "전 시리즈 밸브가 압력 사이클과 기밀 이중 테스트를 통과합니다",
    "Toutes les vannes passent des tests de cyclage de pression et d'étanchéité",
    "تجتاز جميع سلاسل الصمامات اختبارات الضغط والإحكام المزدوجة",
  ],
  feature4: [
    "国家级高新技术企业，专精特新认证",
    "National High-Tech Enterprise, Specialized & Innovative SME",
    "国家級ハイテク企業、専精特新認定",
    "국가급 첨단기술 기업, 전문정신 인증",
    "Entreprise nationale de haute technologie, certifiée spécialisée et innovante",
    "مؤسسة وطنية عالية التقنية، معتمدة كشركة متخصصة ومبتكرة",
  ],
  productsPageSubtitle: [
    "覆盖精密阀门、接头、过滤器与流体系统元件全系列产品，提供完整解决方案",
    "Full series of precision valves, fittings, filters and fluid system components with complete solutions",
    "精密バルブ、継手、フィルター、流体システム部品の全シリーズをカバーし、完全なソリューションを提供",
    "정밀 밸브, 피팅, 필터, 유체 시스템 부품 전 시리즈를 포괄하며 완벽한 솔루션을 제공합니다",
    "Gamme complète de vannes, raccords, filtres et composants de systèmes fluidiques avec solutions intégrées",
    "جميع سلاسل الصمامات والوصلات والمرشحات ومكونات أنظمة السوائل مع حلول متكاملة",
  ],
  careersPageSubtitle: [
    "晧固阀门 期待与优秀的您一起，推动流体控制技术的发展",
    "HAOGU VALVE looks forward to working with outstanding talents like you to advance fluid control technology",
    "晧固バルブは優秀なあなたとともに、流体制御技術の発展を推進することを期待しています",
    "하오구밸브는 우수한 인재와 함께 유체 제어 기술 발전을 추진하기를 기대합니다",
    "HAOGU VALVE espère faire progresser les technologies de contrôle des fluides avec des talents comme vous",
    "تتطلع هاوجو إلى العمل مع المواهب المتميزة مثلكم لتطوير تقنيات التحكم في السوائل",
  ],
  industriesPageSubtitle: [
    "晧固阀门精密流体元件广泛应用于半导体、石油天然气、化工制药、氢能源、分析仪器等多个行业领域",
    "HAOGU VALVE precision fluid components are widely applied in semiconductor, oil & gas, chemical, pharmaceutical, hydrogen energy, analytical instrumentation and many other industries",
    "晧固バルブの精密流体部品は半導体、石油・ガス、化学・製薬、水素エネルギー、分析機器など多くの業界に広く応用されています",
    "하오구밸브 정밀 유체 부품은 반도체, 석유가스, 화학제약, 수소에너지, 분석기기 등 많은 산업 분야에 널리 응용됩니다",
    "Les composants de fluides de précision HAOGU VALVE sont largement appliqués dans les semi-conducteurs, le pétrole et le gaz, la chimie, la pharmacie, l'hydrogène et l'analyse",
    "تطبق مكونات السوائل الدقيقة من هاوجو على نطاق واسع في أشباه الموصلات والنفط والغاز والكيماويات والأدوية والهيدروجين والأجهزة التحليلية وغيرها",
  ],
  newsPageSubtitle: [
    "了解晧固阀门的最新动态、产品发布与技术文章",
    "Stay up to date with HAOGU VALVE's latest news, product launches and technical articles",
    "晧固バルブの最新ニュース、製品発表、技術記事をご覧ください",
    "하오구밸브의 최신 소식, 제품 출시, 기술 기사를 확인하세요",
    "Suivez les dernières actualités, lancements de produits et articles techniques de HAOGU VALVE",
    "اطّلع على آخر أخبار هاوجو وإطلاقات المنتجات والمقالات التقنية",
  ],
  newsDesc: [
    "了解晧固阀门最新动态与行业资讯",
    "Stay updated with HAOGU VALVE news and industry insights",
    "晧固バルブの最新情報と業界ニュースをご覧ください",
    "하오구밸브의 최신 동향과 업계 정보를 확인하세요",
    "Suivez les dernières actualités et tendances du secteur",
    "تابع أحدث أخبار هاوجو ورؤى القطاع",
  ],
  contactAboutInfo: [
    "联系我们获取更多关于 晧固阀门 的信息",
    "Contact us for more information about HAOGU VALVE",
    "晧固バルブの詳細についてはお問い合わせください",
    "하오구밸브에 대한 자세한 정보는 문의해 주세요",
    "Contactez-nous pour plus d'informations sur HAOGU VALVE",
    "اتصل بنا لمزيد من المعلومات حول هاوجو",
  ],
  whyJoin: [
    "为什么加入 晧固阀门",
    "Why join HAOGU VALVE",
    "なぜ晧固バルブに参加するのか",
    "왜 하오구밸브에 합류해야 하나요",
    "Pourquoi rejoindre HAOGU VALVE",
    "لماذا تنضم إلى هاوجو",
  ],
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
fs.writeFileSync(path, c);
console.log("replaced", replaced, "values");
