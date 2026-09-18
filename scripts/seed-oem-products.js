// OEM 产品转化种子：重建产品 Tab/分类/产品 + 商城分类/商品（芯阀 VALTRIX OEM 体系）
// 幂等：按 slug upsert；旧通用阀门数据（HG-*）整体删除后重建
const { PrismaClient } = require("D:/阀门网站/lib/generated/prisma");
const p = new PrismaClient();
const IMG = "/uploads/oem/";
const PH = "/placeholders/industry-default.webp";

// 图片映射
const IMG_GN = IMG + "GN_2.png";
const IMG_GMN = IMG + "GMN_1.png";
const IMG_GJ = IMG + "GJ_1.jpg";
const IMG_GJS = IMG + "GJ_8.png";
const IMG_GG = IMG + "GG_1.jpg";
const IMG_IE = IMG + "IE-TB8.jpg";
const IMG_IT = IMG + "IT-TB8-TB8-TB4_1.png";
const IMG_DV12A = IMG + "dv12a-mr4.jpg";
const IMG_DV12A_S = IMG + "dv12a-smr4.jpg";
const IMG_DV22A = IMG + "dv22a-mr8.jpg";
const IMG_CV3 = IMG + "cv3-fmr4.jpg";
const IMG_FT4 = IMG + "ft4-mr4.png";

const TABS = [
  { slug: "vcr-fittings", name: "VCR 面密封接头", nameEn: "VCR Face Seal Fittings", nameJa: "VCRフェイスシール継手", nameKo: "VCR 페이스실 피팅", nameFr: "Raccords VCR à joint facial", nameAr: "وصلات VCR ذات الإحكام السطحي", sortOrder: 1 },
  { slug: "welded-fittings", name: "焊接接头", nameEn: "Welded Fittings", nameJa: "溶接継手", nameKo: "용접 피팅", nameFr: "Raccords soudés", nameAr: "وصلات ملحومة", sortOrder: 2 },
  { slug: "diaphragm-valves", name: "隔膜阀", nameEn: "Diaphragm Valves", nameJa: "ダイヤフラム弁", nameKo: "다이어프램 밸브", nameFr: "Vannes à membrane", nameAr: "صمامات غشائية", sortOrder: 3 },
  { slug: "pressure-reducers", name: "减压阀", nameEn: "Pressure Reducers", nameJa: "減圧弁", nameKo: "감압 밸브", nameFr: "Détendeurs", nameAr: "منظمات الضغط", sortOrder: 4 },
  { slug: "check-valves", name: "单向阀", nameEn: "Check Valves", nameJa: "逆止弁", nameKo: "체크 밸브", nameFr: "Clapets anti-retour", nameAr: "صمامات عدم الرجوع", sortOrder: 5 },
  { slug: "filters", name: "气体过滤器", nameEn: "Gas Filters", nameJa: "ガスフィルタ", nameKo: "가스 필터", nameFr: "Filtres à gaz", nameAr: "مرشحات الغاز", sortOrder: 6 },
];

// 旧通用阀门数据（删除重建）
const OLD_TAB_SLUGS = ["gate-valve", "ball-valve", "butterfly-valve", "check-valve", "safety-valve", "regulating-valve"];

const CATS = [
  { tabSlug: "vcr-fittings", slug: "vcr-g-series", name: "VCR 面密封接头 G 系列", nameEn: "VCR Face Seal Fittings G Series", sortOrder: 0 },
  { tabSlug: "welded-fittings", slug: "micro-weld-i", name: "微焊接接头 I 系列", nameEn: "Micro Welded Fittings I Series", sortOrder: 0 },
  { tabSlug: "diaphragm-valves", slug: "dv-series", name: "隔膜阀系列", nameEn: "Diaphragm Valve Series", sortOrder: 0 },
  { tabSlug: "pressure-reducers", slug: "pre-prt-series", name: "减压阀系列", nameEn: "Pressure Reducer Series", sortOrder: 0 },
  { tabSlug: "check-valves", slug: "cv-bsm-series", name: "单向阀与计量阀", nameEn: "Check & Metering Valves", sortOrder: 0 },
  { tabSlug: "filters", slug: "ft-series", name: "气体过滤器系列", nameEn: "Gas Filter Series", sortOrder: 0 },
];

const PRODUCTS = [
  // ===== VCR 面密封接头 =====
  {
    tabSlug: "vcr-fittings", categorySlug: "vcr-g-series", slug: "vcr-gn-fmr4", model: "316L-GN-FMR4",
    name: "VCR 阴螺纹螺母接头", nameEn: "VCR Female Nut Fitting", subtitle: "1/4\" VCR 内螺纹，金属面密封", subtitleEn: "1/4\" VCR female thread, metal face seal",
    summary: "316L 不锈钢 VCR 阴螺纹螺母接头，金属对金属面密封，适用于超高纯气体与流体系统。", summaryEn: "316L SS VCR female nut fitting with metal-to-metal face seal for UHP gas and fluid systems.",
    description: "<p>VCR 面密封接头采用 316L 不锈钢，金属对金属密封结构，无弹性体，适用于超高纯工艺气体管路。</p><p>1/4\" 阴螺纹（FMR），可搭配 GN 系列螺母与垫片使用，洁净度可达 EP 级。</p>",
    descriptionEn: "<p>VCR face seal fitting in 316L SS with metal-to-metal sealing, elastomer-free for UHP process gas lines.</p><p>1/4\" female thread (FMR), works with GN nuts and gaskets, EP cleanliness available.</p>",
    features: ["316L 不锈钢", "金属面密封无弹性体", "适配超高纯工艺"], featuresEn: ["316L stainless steel", "Metal face seal, elastomer-free", "For UHP processes"],
    coverImage: IMG_GN, price: 15, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\" (6.35mm)" },
      { name: "连接", nameEn: "Connection", value: "VCR 阴螺纹 FMR" },
      { name: "材质", nameEn: "Material", value: "316L" },
      { name: "表面处理", nameEn: "Finish", value: "标准 / EP" },
    ],
  },
  {
    tabSlug: "vcr-fittings", categorySlug: "vcr-g-series", slug: "vcr-gmn-mr4", model: "316L-GMN-MR4",
    name: "VCR 阳螺纹螺母接头", nameEn: "VCR Male Nut Fitting", subtitle: "1/4\" VCR 外螺纹，金属面密封", subtitleEn: "1/4\" VCR male thread, metal face seal",
    summary: "316L VCR 阳螺纹螺母接头，外螺纹活接结构，密封可靠，适配高纯气体系统。", summaryEn: "316L VCR male nut fitting with external thread union, reliable sealing for high-purity gas systems.",
    description: "<p>VCR 阳螺纹螺母接头（MR）与阴螺纹接头配合使用，构成 VCR 金属面密封连接。</p><p>316L 材质，可选 EP 表面处理，满足半导体级洁净要求。</p>",
    descriptionEn: "<p>VCR male nut fitting (MR) pairs with female fitting for metal face seal connection.</p><p>316L with optional EP finish for semiconductor-grade cleanliness.</p>",
    features: ["外螺纹活接结构", "316L 材质", "EP 表面可选"], featuresEn: ["Male thread union", "316L material", "EP finish option"],
    coverImage: IMG_GMN, price: 9, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\" (6.35mm)" },
      { name: "连接", nameEn: "Connection", value: "VCR 阳螺纹 MR" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "vcr-fittings", categorySlug: "vcr-g-series", slug: "vcr-gj-long-tube", model: "316L-GJ-MR4-TB4-12",
    name: "VCR 长焊接接管", nameEn: "VCR Long Weld Tube Adapter", subtitle: "1/4\" VCR 转 1/4\" 对焊，L=43.2mm", subtitleEn: "1/4\" VCR to 1/4\" butt weld, L=43.2mm",
    summary: "VCR 转对焊长接管，一端 VCR 阳螺纹，一端 1/4\" 对焊口，长度 43.2mm。", summaryEn: "VCR to butt-weld long adapter, VCR male end to 1/4\" weld end, L=43.2mm.",
    description: "<p>长焊接接管将 VCR 面密封连接转换为对焊连接，便于管道布局与焊接安装。</p><p>316L 材质，标准/EP 表面可选，用于超高纯管路系统。</p>",
    descriptionEn: "<p>Long weld tube adapter converts VCR face seal to butt weld connection for flexible piping layout.</p><p>316L, standard or EP finish, for UHP tubing systems.</p>",
    features: ["VCR 转对焊", "L=43.2mm", "316L 材质"], featuresEn: ["VCR to weld", "L=43.2mm", "316L material"],
    coverImage: IMG_GJ, price: 26, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "长度", nameEn: "Length", value: "43.2mm" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "vcr-fittings", categorySlug: "vcr-g-series", slug: "vcr-gjs-short-tube", model: "316L-GJS-MR4-TB4-12",
    name: "VCR 短焊接接管", nameEn: "VCR Short Weld Tube Adapter", subtitle: "1/4\" VCR 转 1/4\" 对焊，L=27.9mm", subtitleEn: "1/4\" VCR to 1/4\" butt weld, L=27.9mm",
    summary: "VCR 转对焊短接管，长度 27.9mm，适用于紧凑布局的高纯管路。", summaryEn: "VCR to butt-weld short adapter, L=27.9mm for compact UHP layouts.",
    description: "<p>短焊接接管适用于空间受限的高纯管路，一端 VCR 阳螺纹、一端对焊口。</p><p>316L 材质，金属面密封，洁净室包装。</p>",
    descriptionEn: "<p>Short weld adapter for space-constrained UHP lines, VCR male to weld end.</p><p>316L, metal face seal, cleanroom packaged.</p>",
    features: ["紧凑设计 L=27.9mm", "VCR 转对焊", "洁净室包装"], featuresEn: ["Compact L=27.9mm", "VCR to weld", "Cleanroom packaged"],
    coverImage: IMG_GJS, price: 24, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "长度", nameEn: "Length", value: "27.9mm" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "vcr-fittings", categorySlug: "vcr-g-series", slug: "vcr-gg-gasket", model: "316L-GG-MR4",
    name: "VCR 金属垫片", nameEn: "VCR Metal Gasket", subtitle: "1/4\" VCR 密封垫片，金属密封", subtitleEn: "1/4\" VCR sealing gasket, metal seal",
    summary: "VCR 金属面密封垫片，316L 材质，用于 VCR 接头连接密封。", summaryEn: "VCR metal face seal gasket, 316L, for VCR fitting connections.",
    description: "<p>VCR 垫片用于两个 VCR 连接面之间，形成金属对金属密封，可重复使用。</p><p>适配 1/4\" VCR 接头，高纯工艺推荐。</p>",
    descriptionEn: "<p>VCR gasket sits between VCR faces creating metal-to-metal seal, reusable.</p><p>For 1/4\" VCR fittings, recommended for high-purity processes.</p>",
    features: ["金属对金属密封", "可重复使用", "316L 材质"], featuresEn: ["Metal-to-metal seal", "Reusable", "316L material"],
    coverImage: IMG_GG, price: 5, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  // ===== 焊接接头 =====
  {
    tabSlug: "welded-fittings", categorySlug: "micro-weld-i", slug: "weld-elbow-ie-tb4", model: "316L-IE-TB4",
    name: "微焊接弯头", nameEn: "Micro Weld Elbow", subtitle: "1/4\" 对焊弯头，90°", subtitleEn: "1/4\" butt weld elbow, 90°",
    summary: "316L 微焊接弯头，两端 1/4\" 对焊口，适用于高纯管路紧凑转弯。", summaryEn: "316L micro weld elbow, 1/4\" weld ends for compact UHP turns.",
    description: "<p>微焊接弯头 I 系列采用 316L 材质，小尺寸设计，焊接后内壁光滑无死角。</p><p>适配 1/4\" EP 管，用于半导体工艺气体管路。</p>",
    descriptionEn: "<p>Micro weld elbow I series in 316L, compact size, smooth bore after welding.</p><p>For 1/4\" EP tubing in semiconductor process lines.</p>",
    features: ["316L 材质", "内壁光滑无死角", "1/4\" 对焊"], featuresEn: ["316L", "Smooth bore", "1/4\" weld"],
    coverImage: IMG_IE, price: 35, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "角度", nameEn: "Angle", value: "90°" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "welded-fittings", categorySlug: "micro-weld-i", slug: "weld-tee-it-tb4", model: "316L-IT-TB4",
    name: "微焊接三通", nameEn: "Micro Weld Tee", subtitle: "1/4\" 对焊三通", subtitleEn: "1/4\" butt weld tee",
    summary: "316L 微焊接三通，三端 1/4\" 对焊口，均布分流设计。", summaryEn: "316L micro weld tee with three 1/4\" weld ends.",
    description: "<p>微焊接三通用于管路三分支，316L 材质，焊接后内壁光滑，适配超高纯系统。</p>",
    descriptionEn: "<p>Micro weld tee for three-way branch, 316L, smooth bore after welding for UHP systems.</p>",
    features: ["三端 1/4\" 对焊", "均布分流", "316L 材质"], featuresEn: ["Three 1/4\" weld ends", "Balanced flow", "316L"],
    coverImage: IMG_IT, price: 40, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "类型", nameEn: "Type", value: "等径三通" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "welded-fittings", categorySlug: "micro-weld-i", slug: "weld-cross-ic-tb4", model: "316L-IC-TB4",
    name: "微焊接四通", nameEn: "Micro Weld Cross", subtitle: "1/4\" 对焊四通", subtitleEn: "1/4\" butt weld cross",
    summary: "316L 微焊接四通，四端 1/4\" 对焊口，多路分配应用。", summaryEn: "316L micro weld cross, four 1/4\" weld ends.",
    description: "<p>微焊接四通用于多点分配管路，316L 材质，内壁光滑无死角，适配高纯气体分配系统。</p>",
    descriptionEn: "<p>Micro weld cross for multi-point distribution, 316L, smooth bore for UHP gas distribution.</p>",
    features: ["四端 1/4\" 对焊", "多点分配", "316L 材质"], featuresEn: ["Four weld ends", "Multi-point distribution", "316L"],
    coverImage: IMG_IT, price: 45, specs: [
      { name: "口径", nameEn: "Size", value: "1/4\"" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  // ===== 隔膜阀 =====
  {
    tabSlug: "diaphragm-valves", categorySlug: "dv-series", slug: "dv12a-fmr4-hp", model: "316L-DV12A-FMR4-HP",
    name: "手动低压隔膜阀", nameEn: "Manual Low-Pressure Diaphragm Valve", subtitle: "250psi，-23℃~66℃，VCR 阴螺纹", subtitleEn: "250psi, -23~66°C, VCR female",
    summary: "手动隔膜阀，工作压力 250psi，VCR 阴螺纹连接，适用于高纯气体开关控制。", summaryEn: "Manual diaphragm valve, 250psi, VCR female connection for UHP gas on/off control.",
    description: "<p>DV12A 手动隔膜阀采用 316L 阀体与聚酰亚胺/PTFE 隔膜，无死角结构，适用于超高纯工艺气体。</p><p>工作压力最大 250psi（1.72MPa），温度 -23℃～66℃，VCR 1/4\" 阴螺纹连接。</p>",
    descriptionEn: "<p>DV12A manual diaphragm valve with 316L body and PI/PTFE diaphragm, dead-space-free for UHP process gas.</p><p>Max 250psi (1.72MPa), -23~66°C, 1/4\" VCR female connection.</p>",
    features: ["无死角隔膜密封", "250psi 工作压力", "VCR 1/4\" 连接"], featuresEn: ["Dead-space-free diaphragm seal", "250psi working pressure", "1/4\" VCR connection"],
    coverImage: IMG_DV12A, price: 495, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 250psi (1.72MPa)" },
      { name: "温度", nameEn: "Temperature", value: "-23℃ ~ 66℃" },
      { name: "连接", nameEn: "Connection", value: "1/4\" VCR 阴螺纹" },
      { name: "驱动", nameEn: "Actuation", value: "手动" },
    ],
  },
  {
    tabSlug: "diaphragm-valves", categorySlug: "dv-series", slug: "dv12a-mr4-nc-hp", model: "316L-DV12A-MR4-NC-HP",
    name: "气动常闭隔膜阀", nameEn: "Pneumatic Normally-Closed Diaphragm Valve", subtitle: "常闭，250psi，VCR 阳螺纹", subtitleEn: "NC, 250psi, VCR male",
    summary: "气动常闭隔膜阀，失气关闭，VCR 阳螺纹连接，适用于自动化高纯气体控制。", summaryEn: "Pneumatic NC diaphragm valve, air-to-open, VCR male, for automated UHP gas control.",
    description: "<p>气动常闭隔膜阀（NC-HP）失气自动关闭，保障系统安全；气动驱动适合自动化控制。</p><p>工作压力最大 250psi，1/4\" VCR 阳螺纹连接，316L 阀体。</p>",
    descriptionEn: "<p>Pneumatic NC diaphragm valve fails closed for system safety, pneumatic actuation for automation.</p><p>Max 250psi, 1/4\" VCR male connection, 316L body.</p>",
    features: ["失气关闭（常闭）", "气动驱动可自动化", "VCR 1/4\" 连接"], featuresEn: ["Fail-closed (NC)", "Pneumatic actuation", "1/4\" VCR connection"],
    coverImage: IMG_DV12A_S, price: 440, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 250psi (1.72MPa)" },
      { name: "温度", nameEn: "Temperature", value: "-23℃ ~ 66℃" },
      { name: "连接", nameEn: "Connection", value: "1/4\" VCR 阳螺纹" },
      { name: "驱动", nameEn: "Actuation", value: "气动常闭" },
    ],
  },
  {
    tabSlug: "diaphragm-valves", categorySlug: "dv-series", slug: "dv22a-mr8", model: "316L-DV22A-MR8",
    name: "中流量隔膜阀", nameEn: "Medium-Flow Diaphragm Valve", subtitle: "1/2\" VCR，CV 0.65", subtitleEn: "1/2\" VCR, CV 0.65",
    summary: "低压中流量隔膜阀，CV 0.65，1/2\" VCR 连接，适用于较大流量高纯气体。", summaryEn: "Low-pressure medium-flow diaphragm valve, CV 0.65, 1/2\" VCR.",
    description: "<p>DV22A 中流量隔膜阀提供更大的流通能力（CV 0.65），适用于工艺气体主管路。</p><p>316L 阀体，1/2\" VCR 连接，手动/气动可选。</p>",
    descriptionEn: "<p>DV22A medium-flow diaphragm valve with higher capacity (CV 0.65) for main process gas lines.</p><p>316L body, 1/2\" VCR, manual or pneumatic.</p>",
    features: ["CV 0.65 大流量", "1/2\" VCR 连接", "手动/气动可选"], featuresEn: ["CV 0.65 high flow", "1/2\" VCR", "Manual or pneumatic"],
    coverImage: IMG_DV22A, price: 680, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 250psi (1.72MPa)" },
      { name: "CV 值", nameEn: "CV", value: "0.65" },
      { name: "连接", nameEn: "Connection", value: "1/2\" VCR" },
    ],
  },
  // ===== 减压阀 =====
  {
    tabSlug: "pressure-reducers", categorySlug: "pre-prt-series", slug: "pre1-mr4", model: "316L-PRE1-MR4",
    name: "小流量减压阀", nameEn: "Low-Flow Pressure Reducer", subtitle: "入口 24.1MPa，CV 0.09/0.15", subtitleEn: "Inlet 24.1MPa, CV 0.09/0.15",
    summary: "小流量减压阀，入口压力最高 24.1MPa，适用于高纯气体精密减压。", summaryEn: "Low-flow pressure reducer, max inlet 24.1MPa for precise UHP gas regulation.",
    description: "<p>PRE1 小流量减压阀提供稳定的输出压力控制，适用于半导体工艺气体柜。</p><p>316L 阀体，金属膜片密封，入口最高 24.1MPa。</p>",
    descriptionEn: "<p>PRE1 low-flow reducer delivers stable outlet regulation for semiconductor gas cabinets.</p><p>316L body, metal diaphragm, max inlet 24.1MPa.</p>",
    features: ["入口 24.1MPa", "金属膜片密封", "半导体气柜适用"], featuresEn: ["24.1MPa inlet", "Metal diaphragm", "For gas cabinets"],
    coverImage: PH, price: 1580, specs: [
      { name: "入口压力", nameEn: "Inlet", value: "MAX. 24.1MPa" },
      { name: "CV 值", nameEn: "CV", value: "0.09 / 0.15" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  {
    tabSlug: "pressure-reducers", categorySlug: "pre-prt-series", slug: "prt1-mr4", model: "316L-PRT1-MR4",
    name: "联接式膜片减压阀", nameEn: "Tied-Diaphragm Pressure Reducer", subtitle: "入口 31.0MPa，CV 0.09/0.15", subtitleEn: "Inlet 31.0MPa, CV 0.09/0.15",
    summary: "联接式膜片减压阀，入口压力最高 31.0MPa，高精度输出控制。", summaryEn: "Tied-diaphragm reducer, max inlet 31.0MPa, high-precision outlet control.",
    description: "<p>PRT1 联接式膜片减压阀采用膜片式调节机构，输出压力稳定，适用于高压气源精密减压。</p><p>316L 材质，入口最高 31.0MPa，洁净室装配。</p>",
    descriptionEn: "<p>PRT1 tied-diaphragm reducer with stable outlet pressure for high-pressure source regulation.</p><p>316L, max inlet 31.0MPa, cleanroom assembled.</p>",
    features: ["入口 31.0MPa", "膜片式高精度", "洁净室装配"], featuresEn: ["31.0MPa inlet", "Diaphragm precision", "Cleanroom assembled"],
    coverImage: PH, price: 1880, specs: [
      { name: "入口压力", nameEn: "Inlet", value: "MAX. 31.0MPa" },
      { name: "CV 值", nameEn: "CV", value: "0.09 / 0.15" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  // ===== 单向阀 =====
  {
    tabSlug: "check-valves", categorySlug: "cv-bsm-series", slug: "cv3-fmr4-hp", model: "316L-CV3-FMR4-HP",
    name: "全焊接单向阀", nameEn: "All-Welded Check Valve", subtitle: "20.7MPa，开启 <2psi，EP", subtitleEn: "20.7MPa, crack <2psi, EP",
    summary: "全焊接结构单向阀，开启压力小于 2psi，EP 表面，适用于超高纯气体防倒流。", summaryEn: "All-welded check valve, crack <2psi, EP finish for UHP gas backflow prevention.",
    description: "<p>CV3 全焊接单向阀无弹性体密封，全焊接结构，适用于超高纯气体系统防止倒流。</p><p>开启压力小于 2psi，工作压力最大 20.7MPa，EP 表面处理，VCR 1/4\" 连接。</p>",
    descriptionEn: "<p>CV3 all-welded check valve, elastomer-free with welded body for UHP gas backflow prevention.</p><p>Crack <2psi, max 20.7MPa, EP finish, 1/4\" VCR connection.</p>",
    features: ["全焊接无弹性体", "开启 <2psi", "20.7MPa / EP"], featuresEn: ["All-welded, elastomer-free", "Crack <2psi", "20.7MPa / EP"],
    coverImage: IMG_CV3, price: 350, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 20.7MPa" },
      { name: "开启压力", nameEn: "Crack", value: "< 2psi" },
      { name: "连接", nameEn: "Connection", value: "1/4\" VCR 阴螺纹" },
      { name: "表面", nameEn: "Finish", value: "EP" },
    ],
  },
  {
    tabSlug: "check-valves", categorySlug: "cv-bsm-series", slug: "bsm-mr4", model: "316L-BSM-MR4",
    name: "波纹管计量阀", nameEn: "Bellows Metering Valve", subtitle: "4.8MPa，CV 0.19（计量）", subtitleEn: "4.8MPa, CV 0.19 (metering)",
    summary: "波纹管计量阀，精确流量调节，适用于分析仪器与高纯气体微调。", summaryEn: "Bellows metering valve for precise flow adjustment in analyzers and UHP gas.",
    description: "<p>BSM 波纹管计量阀提供精细流量控制，波纹管密封无泄漏，适用于气体分析仪器与取样系统。</p><p>工作压力最大 4.8MPa，计量型 CV 0.19 / 调节型 CV 0.3。</p>",
    descriptionEn: "<p>BSM bellows metering valve for fine flow control, bellows seal leak-free for analyzers and sampling.</p><p>Max 4.8MPa, metering CV 0.19 / regulating CV 0.3.</p>",
    features: ["波纹管密封无泄漏", "精细流量调节", "4.8MPa"], featuresEn: ["Bellows seal leak-free", "Fine metering", "4.8MPa"],
    coverImage: PH, price: 980, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 4.8MPa" },
      { name: "CV 值", nameEn: "CV", value: "0.19（计量）/ 0.3（调节）" },
      { name: "材质", nameEn: "Material", value: "316L" },
    ],
  },
  // ===== 过滤器 =====
  {
    tabSlug: "filters", categorySlug: "ft-series", slug: "ft4-mr4-s15", model: "316L-FT4-MR4-S15-HP",
    name: "粉末烧结过滤器", nameEn: "Sintered Powder Filter", subtitle: "滤芯最小 0.5μm，20.7MPa", subtitleEn: "Element min 0.5μm, 20.7MPa",
    summary: "粉末烧结滤芯气体过滤器，过滤精度最小 0.5 微米，适用于高纯气体过滤。", summaryEn: "Sintered powder element gas filter, min 0.5μm for UHP gas filtration.",
    description: "<p>FT4 粉末烧结过滤器采用烧结金属滤芯，过滤精度最小 0.5 微米，去除工艺气体颗粒。</p><p>工作压力最大 20.7MPa，316L 材质，VCR 1/4\" 连接，EP 表面可选。</p>",
    descriptionEn: "<p>FT4 sintered powder filter with metal element, min 0.5μm particle removal for process gas.</p><p>Max 20.7MPa, 316L, 1/4\" VCR, EP finish option.</p>",
    features: ["滤芯 0.5μm", "20.7MPa", "316L / EP 可选"], featuresEn: ["0.5μm element", "20.7MPa", "316L / EP option"],
    coverImage: IMG_FT4, price: 305, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 20.7MPa" },
      { name: "滤芯", nameEn: "Element", value: "烧结金属，最小 0.5μm" },
      { name: "连接", nameEn: "Connection", value: "1/4\" VCR" },
    ],
  },
  {
    tabSlug: "filters", categorySlug: "ft-series", slug: "ft5-mr4", model: "316L-FT5-MR4",
    name: "陶瓷滤芯过滤器", nameEn: "Ceramic Element Filter", subtitle: "滤芯 2.5nm，20.7MPa", subtitleEn: "Element 2.5nm, 20.7MPa",
    summary: "陶瓷滤芯气体过滤器，过滤精度 2.5 纳米，适用于超高纯气体深度过滤。", summaryEn: "Ceramic element gas filter, 2.5nm for UHP gas deep filtration.",
    description: "<p>FT5 陶瓷滤芯过滤器提供纳米级过滤精度（2.5nm），满足半导体工艺气体颗粒要求。</p><p>工作压力最大 20.7MPa，316L 阀体，VCR 连接。</p>",
    descriptionEn: "<p>FT5 ceramic element filter with 2.5nm precision for semiconductor-grade particle removal.</p><p>Max 20.7MPa, 316L body, VCR connection.</p>",
    features: ["滤芯 2.5nm", "20.7MPa", "半导体级过滤"], featuresEn: ["2.5nm element", "20.7MPa", "Semiconductor-grade"],
    coverImage: PH, price: 420, specs: [
      { name: "工作压力", nameEn: "Pressure", value: "MAX. 20.7MPa" },
      { name: "滤芯", nameEn: "Element", value: "陶瓷，2.5nm" },
      { name: "连接", nameEn: "Connection", value: "VCR" },
    ],
  },
];

const SHOP_CATS = [
  { slug: "diaphragm-valve", name: "隔膜阀", nameEn: "Diaphragm Valves", sortOrder: 0 },
  { slug: "check-valve", name: "单向阀", nameEn: "Check Valves", sortOrder: 1 },
  { slug: "filter", name: "过滤器", nameEn: "Filters", sortOrder: 2 },
  { slug: "fitting", name: "管阀件", nameEn: "Fittings", sortOrder: 3 },
];

const SHOP_PRODUCTS = [
  {
    slug: "dv12a-fmr4-manual", catSlug: "diaphragm-valve",
    name: "手动隔膜阀 316L-DV12A-FMR4-HP", nameEn: "Manual Diaphragm Valve 316L-DV12A-FMR4-HP",
    summary: "1/4\" VCR 手动隔膜阀，250psi，支持口径与表面处理规格选配。", summaryEn: "1/4\" VCR manual diaphragm valve, 250psi, configurable by size and finish.",
    description: "<p>规格选配：口径、连接形式、表面处理组合定价。</p><p>适用于超高纯工艺气体开关控制。</p>",
    descriptionEn: "<p>Configuration: size, connection and finish combined pricing.</p><p>For UHP process gas on/off control.</p>",
    coverImage: IMG_DV12A, price: 495, originalPrice: 545, unit: "个", stock: 200, minOrder: 1, status: "published", featured: true, sortOrder: 0,
    priceTiers: [{ qty: 5, price: 470 }, { qty: 20, price: 445 }, { qty: 100, price: 420 }],
    specs: [
      { name: "口径", nameEn: "Size", options: [
        { label: "1/4\" (FMR4)", labelEn: "1/4\" (FMR4)", price: 0, stock: 100 },
        { label: "1/2\" (FMR8)", labelEn: "1/2\" (FMR8)", price: 120, stock: 60 },
      ]},
      { name: "表面处理", nameEn: "Finish", options: [
        { label: "标准", labelEn: "Standard", price: 0, stock: 200 },
        { label: "EP（半导体级）", labelEn: "EP (semi-grade)", price: 80, stock: 100 },
      ]},
    ],
  },
  {
    slug: "dv12a-mr4-nc-pneumatic", catSlug: "diaphragm-valve",
    name: "气动常闭隔膜阀 316L-DV12A-MR4-NC-HP", nameEn: "Pneumatic NC Diaphragm Valve 316L-DV12A-MR4-NC-HP",
    summary: "气动常闭隔膜阀，失气关闭，1/4\" VCR 阳螺纹。", summaryEn: "Pneumatic NC diaphragm valve, fail-closed, 1/4\" VCR male.",
    description: "<p>气动驱动常闭型，适合自动化工艺控制，失气自动关闭保证安全。</p>",
    descriptionEn: "<p>Pneumatic NC type for automated process control, fail-closed for safety.</p>",
    coverImage: IMG_DV12A_S, price: 440, originalPrice: 480, unit: "个", stock: 150, minOrder: 1, status: "published", featured: true, sortOrder: 1,
    priceTiers: [{ qty: 5, price: 420 }, { qty: 20, price: 395 }, { qty: 100, price: 370 }],
    specs: [
      { name: "口径", nameEn: "Size", options: [
        { label: "1/4\" (MR4)", labelEn: "1/4\" (MR4)", price: 0, stock: 100 },
        { label: "1/2\" (MR8)", labelEn: "1/2\" (MR8)", price: 130, stock: 50 },
      ]},
      { name: "表面处理", nameEn: "Finish", options: [
        { label: "标准", labelEn: "Standard", price: 0, stock: 150 },
        { label: "EP（半导体级）", labelEn: "EP (semi-grade)", price: 80, stock: 80 },
      ]},
    ],
  },
  {
    slug: "cv3-fmr4-check", catSlug: "check-valve",
    name: "全焊接单向阀 316L-CV3-FMR4-HP", nameEn: "All-Welded Check Valve 316L-CV3-FMR4-HP",
    summary: "全焊接单向阀，开启 <2psi，20.7MPa，VCR 1/4\"。", summaryEn: "All-welded check valve, crack <2psi, 20.7MPa, 1/4\" VCR.",
    description: "<p>无弹性体全焊接结构，EP 表面，用于超高纯气体防倒流。</p>",
    descriptionEn: "<p>Elastomer-free all-welded, EP finish, for UHP gas backflow prevention.</p>",
    coverImage: IMG_CV3, price: 350, originalPrice: 380, unit: "个", stock: 300, minOrder: 1, status: "published", featured: true, sortOrder: 2,
    priceTiers: [{ qty: 10, price: 330 }, { qty: 50, price: 310 }, { qty: 200, price: 290 }],
    specs: [
      { name: "口径", nameEn: "Size", options: [
        { label: "1/4\" (FMR4)", labelEn: "1/4\" (FMR4)", price: 0, stock: 150 },
        { label: "1/2\" (FMR8)", labelEn: "1/2\" (FMR8)", price: 110, stock: 60 },
      ]},
      { name: "开启压力", nameEn: "Crack Pressure", options: [
        { label: "<2psi", labelEn: "<2psi", price: 0, stock: 200 },
        { label: "<5psi", labelEn: "<5psi", price: -20, stock: 100 },
      ]},
    ],
  },
  {
    slug: "ft4-mr4-filter", catSlug: "filter",
    name: "直通过滤器 316L-FT4-MR4-S15-HP", nameEn: "In-Line Filter 316L-FT4-MR4-S15-HP",
    summary: "粉末烧结过滤器，滤芯最小 0.5μm，VCR 外螺纹。", summaryEn: "Sintered powder filter, min 0.5μm, VCR male.",
    description: "<p>半导体级气体过滤，滤芯可更换，EP 表面可选。</p>",
    descriptionEn: "<p>Semi-grade gas filtration, replaceable element, EP finish option.</p>",
    coverImage: IMG_FT4, price: 305, originalPrice: 335, unit: "个", stock: 200, minOrder: 1, status: "published", featured: false, sortOrder: 3,
    priceTiers: [{ qty: 10, price: 288 }, { qty: 50, price: 270 }, { qty: 200, price: 250 }],
    specs: [
      { name: "滤芯精度", nameEn: "Element", options: [
        { label: "0.5μm", labelEn: "0.5μm", price: 0, stock: 100 },
        { label: "2μm", labelEn: "2μm", price: 20, stock: 100 },
      ]},
      { name: "表面处理", nameEn: "Finish", options: [
        { label: "标准", labelEn: "Standard", price: 0, stock: 150 },
        { label: "EP（半导体级）", labelEn: "EP (semi-grade)", price: 70, stock: 60 },
      ]},
    ],
  },
  {
    slug: "vcr-gn-fmr4-nut", catSlug: "fitting",
    name: "VCR 阴螺纹螺母 316L-GN-FMR4", nameEn: "VCR Female Nut 316L-GN-FMR4",
    summary: "1/4\" VCR 内螺纹螺母，金属面密封，多种口径可选。", summaryEn: "1/4\" VCR female nut, metal face seal, multiple sizes.",
    description: "<p>VCR 面密封接头组件，316L 材质，批量价格优惠。</p>",
    descriptionEn: "<p>VCR face seal fitting component, 316L, volume pricing.</p>",
    coverImage: IMG_GN, price: 15, originalPrice: 18, unit: "个", stock: 1000, minOrder: 1, status: "published", featured: false, sortOrder: 4,
    priceTiers: [{ qty: 50, price: 13 }, { qty: 200, price: 11 }, { qty: 500, price: 9 }],
    specs: [
      { name: "口径", nameEn: "Size", options: [
        { label: "1/4\"", labelEn: "1/4\"", price: 0, stock: 500 },
        { label: "3/8\"", labelEn: "3/8\"", price: 5, stock: 300 },
        { label: "1/2\"", labelEn: "1/2\"", price: 10, stock: 300 },
      ]},
    ],
  },
  {
    slug: "vcr-gj-long-tube", catSlug: "fitting",
    name: "VCR 长焊接接管 316L-GJ-MR4-TB4-12", nameEn: "VCR Long Weld Tube 316L-GJ-MR4-TB4-12",
    summary: "1/4\" VCR 转对焊长接管，L=43.2mm。", summaryEn: "1/4\" VCR to weld long adapter, L=43.2mm.",
    description: "<p>VCR 转对焊连接，316L 材质，高纯管路安装。</p>",
    descriptionEn: "<p>VCR to butt-weld adapter, 316L, for UHP piping.</p>",
    coverImage: IMG_GJ, price: 26, originalPrice: 30, unit: "个", stock: 800, minOrder: 1, status: "published", featured: false, sortOrder: 5,
    priceTiers: [{ qty: 50, price: 23 }, { qty: 200, price: 20 }, { qty: 500, price: 17 }],
    specs: [
      { name: "口径", nameEn: "Size", options: [
        { label: "1/4\"", labelEn: "1/4\"", price: 0, stock: 400 },
        { label: "1/2\"", labelEn: "1/2\"", price: 12, stock: 300 },
      ]},
    ],
  },
];

(async () => {
  // 1. 删除旧通用阀门数据
  const oldTabs = await p.productTab.findMany({ where: { slug: { in: OLD_TAB_SLUGS } } });
  for (const t of oldTabs) {
    await p.productCategory.deleteMany({ where: { tabId: t.id } });
  }
  await p.product.deleteMany({ where: { tabId: { in: oldTabs.map((t) => t.id) } } });
  await p.productTab.deleteMany({ where: { slug: { in: OLD_TAB_SLUGS } } });
  console.log("旧 Tab/分类/产品已清理:", OLD_TAB_SLUGS.length);

  // 2. Tab upsert
  const tabById = {};
  for (const t of TABS) {
    const existing = await p.productTab.findUnique({ where: { slug: t.slug } });
    if (existing) { await p.productTab.update({ where: { id: existing.id }, data: t }); tabById[t.slug] = existing.id; }
    else { const c = await p.productTab.create({ data: t }); tabById[t.slug] = c.id; }
  }
  console.log("Tab 就绪:", TABS.length);

  // 3. 分类 upsert
  const catById = {};
  for (const c of CATS) {
    const data = { ...c, tabId: tabById[c.tabSlug] };
    delete data.tabSlug;
    const existing = await p.productCategory.findUnique({ where: { tabId_slug: { tabId: data.tabId, slug: c.slug } } });
    if (existing) { await p.productCategory.update({ where: { id: existing.id }, data }); catById[c.slug] = existing.id; }
    else { const nc = await p.productCategory.create({ data }); catById[c.slug] = nc.id; }
  }
  console.log("分类就绪:", CATS.length);

  // 4. 产品 upsert（先清旧 OEM slug 防脏数据）
  for (const pr of PRODUCTS) {
    const data = { ...pr, tabId: tabById[pr.tabSlug], categoryId: catById[pr.categorySlug] };
    delete data.tabSlug; delete data.categorySlug;
    const existing = await p.product.findUnique({ where: { slug: pr.slug } });
    if (existing) { await p.product.update({ where: { slug: pr.slug }, data }); }
    else { await p.product.create({ data }); }
  }
  console.log("产品就绪:", PRODUCTS.length);

  // 5. 商城：清旧分类与商品后重建
  const oldShop = await p.shopProduct.findMany({ select: { id: true } });
  if (oldShop.length) await p.shopProduct.deleteMany({});
  await p.shopCategory.deleteMany({});
  for (const c of SHOP_CATS) {
    await p.shopCategory.create({ data: c });
  }
  const scById = {};
  for (const c of SHOP_CATS) {
    scById[c.slug] = (await p.shopCategory.findUnique({ where: { slug: c.slug } })).id;
  }
  for (const sp of SHOP_PRODUCTS) {
    const data = { ...sp, categoryId: scById[sp.catSlug] };
    delete data.catSlug;
    const existing = await p.shopProduct.findUnique({ where: { slug: sp.slug } });
    if (existing) { await p.shopProduct.update({ where: { slug: sp.slug }, data }); }
    else { await p.shopProduct.create({ data }); }
  }
  console.log("商城分类/商品就绪:", SHOP_CATS.length, SHOP_PRODUCTS.length);
  await p.$disconnect();
  console.log("ALL DONE");
})().catch(async (e) => { console.error("ERR", e.message); await p.$disconnect(); process.exit(1); });

