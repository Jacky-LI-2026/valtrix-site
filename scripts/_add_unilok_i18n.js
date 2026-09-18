/**
 * 一次性脚本：为 config/i18n.ts 注入 UNILOK 模板首页六语种 key
 * 保留 BOM + CRLF，在每个语种块开头行（如 "  zh: {"）之后插入。
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "config", "i18n.ts");
let raw = fs.readFileSync(FILE, "utf8");

// 去除 BOM 以便处理
const hasBOM = raw.charCodeAt(0) === 0xfeff;
if (hasBOM) raw = raw.slice(1);

// 需要插入的 key（按语种）
const BLOCKS = {
  zh: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "精密流体控制",
    unilokHeroTitle2: "解决方案",
    unilokHeroDesc: "VALTRIX 专注超高纯流体控制领域，为半导体、生物医药、光伏、氢能等行业提供可靠、洁净、可追溯的流体系统解决方案。",
    unilokHeroCta: "浏览产品",
    unilokHeroCta2: "了解更多",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "在全球市场",
    unilokWhoTitle3: "广受认可",
    unilokWhoLead: "一家专注于超高纯流体控制元件的高端制造企业，以工程设计与精密制造为核心，为全球客户提供洁净、可靠的流体系统产品。",
    unilokWhoP1: "专注于超高纯流体控制元件的研发、制造与服务，覆盖半导体、生物医药、光伏、氢能等高端制造领域。",
    unilokWhoP2: "从超高纯材料、精密加工到洁净装配全流程自主可控，万级洁净车间生产。",
    unilokWhoP3: "产品通过氦检漏测试与表面洁净度检测，满足半导体级纯度与泄漏率要求。",
    unilokWhoP4: "北京总部 + 深圳量产基地双轮驱动，服务覆盖中国、东南亚、欧洲、北美等地区。",
    unilokCapTitle: "核心能力",
    unilokCapSubtitle: "以工程设计与精密制造为核心，构建覆盖全流程的流体控制产品能力",
    unilokCap1Title: "工程设计",
    unilokCap1Desc: "从概念设计到产品验证，提供定制化的流体控制元件设计能力，快速响应客户需求。",
    unilokCap2Title: "先进制造",
    unilokCap2Desc: "精密加工与自动化产线，确保产品一致性与高可靠性。",
    unilokCap3Title: "物料管理",
    unilokCap3Desc: "超高纯材料全流程可追溯管理，从源头保障品质。",
    unilokCap4Title: "质量保证",
    unilokCap4Desc: "氦检漏、洁净装配与全检体系，满足半导体级质量要求。",
    unilokProductsTitle: "产品系列",
    unilokProductsSubtitle: "覆盖接头、阀门、过滤器等超高纯流体控制全系列产品",
    unilokProductsMore: "查看全部产品",
    unilokIndustriesTitle: "应用领域",
    unilokIndustriesSubtitle: "为高端制造行业提供可靠的流体控制解决方案",
    unilokNewsTitle: "新闻动态",
    unilokNewsSubtitle: "了解 VALTRIX 最新动态与产品资讯",
    unilokNewsMore: "更多",
    unilokCtaTitle: "有产品询价需求？",
    unilokCtaDesc: "我们的专业团队随时为您提供产品选型与技术支持。",
    unilokCtaButton: "联系我们",
    unilokCtaPhone: "咨询热线",
    unilokViewAll: "查看全部",
  },
  en: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "Precision Fluid Control",
    unilokHeroTitle2: "Solutions",
    unilokHeroDesc: "VALTRIX focuses on ultra-high-purity fluid control, delivering reliable, clean and traceable fluid system solutions for semiconductor, biopharmaceutical, solar and hydrogen industries.",
    unilokHeroCta: "Browse Products",
    unilokHeroCta2: "Learn More",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "Recognized in the",
    unilokWhoTitle3: "Global Market",
    unilokWhoLead: "A high-end manufacturer dedicated to ultra-high-purity fluid control components, building clean and reliable fluid system products for customers worldwide through engineering and precision manufacturing.",
    unilokWhoP1: "Dedicated to the R&D, manufacturing and service of ultra-high-purity fluid control components for semiconductor, biopharmaceutical, solar, hydrogen and other advanced manufacturing sectors.",
    unilokWhoP2: "Full-process self-controlled capabilities from UHP materials and precision machining to cleanroom assembly in class-10,000 cleanrooms.",
    unilokWhoP3: "Products pass helium leak tests and surface cleanliness inspection to meet semiconductor-grade purity and leak-rate requirements.",
    unilokWhoP4: "Dual hubs in Beijing HQ and Shenzhen manufacturing base, serving China, Southeast Asia, Europe and North America.",
    unilokCapTitle: "Capabilities",
    unilokCapSubtitle: "Engineering and precision manufacturing at the core, building full-process fluid control product capabilities",
    unilokCap1Title: "Engineering & Design",
    unilokCap1Desc: "From concept design to product validation, providing customized fluid control component design with rapid response.",
    unilokCap2Title: "Advanced Manufacturing",
    unilokCap2Desc: "Precision machining and automated lines ensure consistency and high reliability.",
    unilokCap3Title: "Material Management",
    unilokCap3Desc: "Full traceability of UHP materials from the source to guarantee quality.",
    unilokCap4Title: "Quality Assurance",
    unilokCap4Desc: "Helium leak testing, cleanroom assembly and 100% inspection meet semiconductor-grade quality.",
    unilokProductsTitle: "Product Lines",
    unilokProductsSubtitle: "A full range of UHP fluid control products — fittings, valves and filters",
    unilokProductsMore: "View All Products",
    unilokIndustriesTitle: "Industries",
    unilokIndustriesSubtitle: "Reliable fluid control solutions for advanced manufacturing industries",
    unilokNewsTitle: "News",
    unilokNewsSubtitle: "Stay updated with VALTRIX's latest news and product launches",
    unilokNewsMore: "More",
    unilokCtaTitle: "Have a product inquiry?",
    unilokCtaDesc: "Our professional team is ready to help with product selection and technical support.",
    unilokCtaButton: "Contact Us",
    unilokCtaPhone: "Hotline",
    unilokViewAll: "View All",
  },
  ja: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "精密流体制御",
    unilokHeroTitle2: "ソリューション",
    unilokHeroDesc: "VALTRIX は超高純度流体制御に特化し、半導体・バイオ医薬・太陽光・水素などの業界に信頼性の高い流体システムソリューションを提供します。",
    unilokHeroCta: "製品を見る",
    unilokHeroCta2: "詳細を見る",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "グローバル市場で",
    unilokWhoTitle3: "認められる存在へ",
    unilokWhoLead: "超高純度流体制御部品に特化したハイエンドメーカーとして、エンジニアリングと精密製造を核に、世界中のお客様へクリーンで信頼性の高い流体システム製品を提供しています。",
    unilokWhoP1: "半導体、バイオ医薬、太陽光、水素などの先端製造分野向けに、超高純度流体制御部品の研究開発・製造・サービスに注力しています。",
    unilokWhoP2: "超高純度材料、精密加工からクリーン組立まで全工程を自社管理し、クラス10000のクリーンルームで生産しています。",
    unilokWhoP3: "製品はヘリウムリークテストと表面清浄度検査に合格し、半導体レベルの純度とリーク率要件を満たしています。",
    unilokWhoP4: "北京本社と深セン量産拠点の二輪体制で、中国・東南アジア・欧州・北米などにサービスを提供しています。",
    unilokCapTitle: "ケイパビリティ",
    unilokCapSubtitle: "エンジニアリングと精密製造を核に、全工程の流体制御製品能力を構築",
    unilokCap1Title: "エンジニアリング＆デザイン",
    unilokCap1Desc: "コンセプト設計から製品検証まで、カスタマイズされた流体制御部品設計を迅速に提供します。",
    unilokCap2Title: "先進製造",
    unilokCap2Desc: "精密加工と自動化ラインにより、一貫性と高い信頼性を確保します。",
    unilokCap3Title: "マテリアル管理",
    unilokCap3Desc: "超高純度材料を全工程でトレーサブルに管理し、品質を源流から保証します。",
    unilokCap4Title: "品質保証",
    unilokCap4Desc: "ヘリウムリークテスト、クリーン組立、全数検査で半導体級の品質を実現します。",
    unilokProductsTitle: "製品シリーズ",
    unilokProductsSubtitle: "継手・バルブ・フィルターなど超高純度流体制御の全シリーズ製品",
    unilokProductsMore: "すべての製品を見る",
    unilokIndustriesTitle: "応用分野",
    unilokIndustriesSubtitle: "先端製造業界へ信頼性の高い流体制御ソリューションを提供",
    unilokNewsTitle: "ニュース",
    unilokNewsSubtitle: "VALTRIX の最新情報と製品ニュース",
    unilokNewsMore: "もっと見る",
    unilokCtaTitle: "製品のお問い合わせは？",
    unilokCtaDesc: "専門チームが製品選定と技術サポートをいつでもご案内します。",
    unilokCtaButton: "お問い合わせ",
    unilokCtaPhone: "お問い合わせ窓口",
    unilokViewAll: "すべて見る",
  },
  ko: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "정밀 유체 제어",
    unilokHeroTitle2: "솔루션",
    unilokHeroDesc: "VALTRIX는 초고순도 유체 제어에 집중하여 반도체, 바이오 의약, 태양광, 수소 등 산업에 신뢰할 수 있는 유체 시스템 솔루션을 제공합니다.",
    unilokHeroCta: "제품 보기",
    unilokHeroCta2: "더 알아보기",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "글로벌 시장에서",
    unilokWhoTitle3: "인정받는 기업",
    unilokWhoLead: "초고순도 유체 제어 부품에 특화된 하이엔드 제조 기업으로, 엔지니어링과 정밀 제조를 중심으로 전 세계 고객에게 청정하고 신뢰할 수 있는 유체 시스템 제품을 제공합니다.",
    unilokWhoP1: "반도체, 바이오 의약, 태양광, 수소 등 첨단 제조 분야를 위한 초고순도 유체 제어 부품의 연구개발, 제조, 서비스에 집중합니다.",
    unilokWhoP2: "초고순도 소재, 정밀 가공부터 클린 조립까지 전 공정을 자체 관리하며 클래스 10000 클린룸에서 생산합니다.",
    unilokWhoP3: "제품은 헬륨 누설 테스트와 표면 청정도 검사를 통과하여 반도체급 순도와 누설률 요구를 충족합니다.",
    unilokWhoP4: "베이징 본사와 선전 양산 기지의 투 트랙 체제로 중국, 동남아, 유럽, 북미 등에 서비스를 제공합니다.",
    unilokCapTitle: "핵심 역량",
    unilokCapSubtitle: "엔지니어링과 정밀 제조를 중심으로 전 공정 유체 제어 제품 역량 구축",
    unilokCap1Title: "엔지니어링 & 디자인",
    unilokCap1Desc: "컨셉 설계부터 제품 검증까지 맞춤형 유체 제어 부품 설계를 신속하게 제공합니다.",
    unilokCap2Title: "첨단 제조",
    unilokCap2Desc: "정밀 가공과 자동화 라인으로 일관성과 높은 신뢰성을 보장합니다.",
    unilokCap3Title: "소재 관리",
    unilokCap3Desc: "초고순도 소재의 전 공정 추적 관리를 통해 품질을 원천에서 보장합니다.",
    unilokCap4Title: "품질 보증",
    unilokCap4Desc: "헬륨 누설 테스트, 클린 조립, 전수 검사로 반도체급 품질을 실현합니다.",
    unilokProductsTitle: "제품 시리즈",
    unilokProductsSubtitle: "피팅, 밸브, 필터 등 초고순도 유체 제어 전 시리즈 제품",
    unilokProductsMore: "모든 제품 보기",
    unilokIndustriesTitle: "응용 분야",
    unilokIndustriesSubtitle: "첨단 제조 산업에 신뢰할 수 있는 유체 제어 솔루션 제공",
    unilokNewsTitle: "뉴스",
    unilokNewsSubtitle: "VALTRIX 최신 소식과 제품 정보",
    unilokNewsMore: "더 보기",
    unilokCtaTitle: "제품 문의가 있으신가요?",
    unilokCtaDesc: "전문 팀이 제품 선정과 기술 지원을 언제든 도와드립니다.",
    unilokCtaButton: "문의하기",
    unilokCtaPhone: "문의 핫라인",
    unilokViewAll: "모두 보기",
  },
  fr: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "Contrôle de fluides",
    unilokHeroTitle2: "de précision",
    unilokHeroDesc: "VALTRIX se concentre sur le contrôle des fluides ultra-purs et fournit des solutions de systèmes fluidiques fiables pour les industries des semi-conducteurs, de la biopharmacie, du solaire et de l'hydrogène.",
    unilokHeroCta: "Voir les produits",
    unilokHeroCta2: "En savoir plus",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "Reconnue sur le",
    unilokWhoTitle3: "marché mondial",
    unilokWhoLead: "Un fabricant haut de gamme dédié aux composants de contrôle de fluides ultra-purs, proposant des produits de systèmes fluidiques propres et fiables aux clients du monde entier grâce à l'ingénierie et à la fabrication de précision.",
    unilokWhoP1: "Dédiée à la R&D, la fabrication et le service de composants de contrôle de fluides ultra-purs pour les semi-conducteurs, la biopharmacie, le solaire, l'hydrogène et d'autres secteurs de fabrication avancée.",
    unilokWhoP2: "Maîtrise complète du processus : matériaux ultra-purs, usinage de précision et assemblage en salle blanche de classe 10 000.",
    unilokWhoP3: "Les produits passent des tests d'étanchéité à l'hélium et des contrôles de propreté de surface, répondant aux exigences de pureté de qualité semi-conducteur.",
    unilokWhoP4: "Double hub : siège à Pékin et base de production à Shenzhen, au service de la Chine, de l'Asie du Sud-Est, de l'Europe et de l'Amérique du Nord.",
    unilokCapTitle: "Capacités",
    unilokCapSubtitle: "Ingénierie et fabrication de précision au cœur, construisant des capacités complètes de contrôle des fluides",
    unilokCap1Title: "Ingénierie & Conception",
    unilokCap1Desc: "De la conception à la validation, nous fournissons une conception personnalisée de composants de contrôle des fluides avec une réponse rapide.",
    unilokCap2Title: "Fabrication avancée",
    unilokCap2Desc: "Usinage de précision et lignes automatisées garantissant cohérence et fiabilité.",
    unilokCap3Title: "Gestion des matériaux",
    unilokCap3Desc: "Traçabilité complète des matériaux ultra-purs pour garantir la qualité à la source.",
    unilokCap4Title: "Assurance qualité",
    unilokCap4Desc: "Tests d'étanchéité à l'hélium, assemblage en salle blanche et inspection 100 % pour une qualité de niveau semi-conducteur.",
    unilokProductsTitle: "Gammes de produits",
    unilokProductsSubtitle: "Une gamme complète de produits de contrôle des fluides ultra-purs — raccords, vannes et filtres",
    unilokProductsMore: "Voir tous les produits",
    unilokIndustriesTitle: "Secteurs",
    unilokIndustriesSubtitle: "Des solutions fiables de contrôle des fluides pour les industries de fabrication avancée",
    unilokNewsTitle: "Actualités",
    unilokNewsSubtitle: "Restez informé des dernières actualités de VALTRIX",
    unilokNewsMore: "Plus",
    unilokCtaTitle: "Une demande de produit ?",
    unilokCtaDesc: "Notre équipe professionnelle est prête à vous aider pour la sélection de produits et le support technique.",
    unilokCtaButton: "Contactez-nous",
    unilokCtaPhone: "Ligne directe",
    unilokViewAll: "Tout voir",
  },
  ar: {
    unilokHeroEyebrow: "PRECISION FLUID CONTROL",
    unilokHeroTitle1: "التحكم الدقيق",
    unilokHeroTitle2: "في السوائل",
    unilokHeroDesc: "تركز VALTRIX على التحكم في السوائل فائقة النقاء، وتوفر حلول أنظمة سوائل موثوقة لصناعات أشباه الموصلات والأدوية الحيوية والطاقة الشمسية والهيدروجين.",
    unilokHeroCta: "تصفح المنتجات",
    unilokHeroCta2: "اعرف المزيد",
    unilokWhoTitle1: "VALTRIX",
    unilokWhoTitle2: "معترف بها في",
    unilokWhoTitle3: "السوق العالمية",
    unilokWhoLead: "شركة تصنيع راقية متخصصة في مكونات التحكم في السوائل فائقة النقاء، تقدم منتجات أنظمة سوائل نظيفة وموثوقة للعملاء حول العالم من خلال الهندسة والتصنيع الدقيق.",
    unilokWhoP1: "متخصصون في البحث والتطوير والتصنيع والخدمات لمكونات التحكم في السوائل فائقة النقاء لصناعات أشباه الموصلات والأدوية الحيوية والطاقة الشمسية والهيدروجين وغيرها.",
    unilokWhoP2: "تحكم كامل في العملية من المواد فائقة النقاء والتصنيع الدقيق إلى التجميع النظيف في غرف نظيفة من الفئة 10000.",
    unilokWhoP3: "تخضع المنتجات لاختبارات تسرب الهيليوم وفحص نظافة السطح لتلبية متطلبات النقاء ومعدل التسرب بدرجة أشباه الموصلات.",
    unilokWhoP4: "مركزان رئيسيان: المقر في بكين وقاعدة الإنتاج في شنتشن، يخدمان الصين وجنوب شرق آسيا وأوروبا وأمريكا الشمالية.",
    unilokCapTitle: "القدرات",
    unilokCapSubtitle: "الهندسة والتصنيع الدقيق في القلب، لبناء قدرات كاملة لمنتجات التحكم في السوائل",
    unilokCap1Title: "الهندسة والتصميم",
    unilokCap1Desc: "من التصميم المفاهيمي إلى التحقق من المنتج، نوفر تصميماً مخصصاً لمكونات التحكم في السوائل مع استجابة سريعة.",
    unilokCap2Title: "التصنيع المتقدم",
    unilokCap2Desc: "التصنيع الدقيق والخطوط الآلية تضمن الاتساق والموثوقية العالية.",
    unilokCap3Title: "إدارة المواد",
    unilokCap3Desc: "تتبع كامل للمواد فائقة النقاء لضمان الجودة من المصدر.",
    unilokCap4Title: "ضمان الجودة",
    unilokCap4Desc: "اختبارات تسرب الهيليوم والتجميع النظيف والفحص الكامل تلبي جودة مستوى أشباه الموصلات.",
    unilokProductsTitle: "سلاسل المنتجات",
    unilokProductsSubtitle: "مجموعة كاملة من منتجات التحكم في السوائل فائقة النقاء — التوصيلات والصمامات والمرشحات",
    unilokProductsMore: "عرض جميع المنتجات",
    unilokIndustriesTitle: "مجالات التطبيق",
    unilokIndustriesSubtitle: "حلول موثوقة للتحكم في السوائل لصناعات التصنيع المتقدم",
    unilokNewsTitle: "الأخبار",
    unilokNewsSubtitle: "تابع آخر أخبار VALTRIX وإطلاقات المنتجات",
    unilokNewsMore: "المزيد",
    unilokCtaTitle: "هل لديك استفسار عن منتج؟",
    unilokCtaDesc: "فريقنا المحترف جاهز لمساعدتك في اختيار المنتج والدعم الفني.",
    unilokCtaButton: "اتصل بنا",
    unilokCtaPhone: "الخط الساخن",
    unilokViewAll: "عرض الكل",
  },
};

// 每个语种块的起始行（2 空格缩进 + 语种代码 + " {")
const LANGS = ["zh", "en", "ja", "ko", "fr", "ar"];
const LINES = raw.split(/\r?\n/);

const insertAfter = (lines, idx, keys) => {
  const pad = "    "; // 4 空格缩进（与现有 key 对齐）
  const block = Object.entries(keys)
    .map(([k, v]) => `${pad}${k}: ${JSON.stringify(v)},`)
    .join("\r\n");
  lines.splice(idx + 1, 0, block);
};

let inserted = 0;
for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i].trim();
  const m = /^([a-z]{2}):\s*\{?$/.exec(line);
  if (m && LANGS.includes(m[1])) {
    const lang = m[1];
    if (BLOCKS[lang]) {
      insertAfter(LINES, i, BLOCKS[lang]);
      inserted++;
      i += Object.keys(BLOCKS[lang]).length; // 跳过已插入行
    }
  }
}

if (inserted !== 6) {
  console.error(`插入失败：仅匹配到 ${inserted}/6 个语种块`);
  process.exit(1);
}

let out = LINES.join("\r\n");
if (hasBOM) out = "\uFEFF" + out;
fs.writeFileSync(FILE, out, "utf8");
console.log(`OK：已向 6 个语种块插入 UNILOK key（每个语种 ${Object.keys(BLOCKS.zh).length} 个）`);
