/**
 * 模板预设（Template Presets）— R2 十套模板方案
 * =====================================================
 * 每套模板 = 完整设计系统（主题色/字体/风格/区块偏好/截图占位）。
 * 当前系统默认为「工业智造风」（T2），作为存量站点的默认模板。
 *
 * 结构：
 *  - theme：对应 ThemeConfig 字段（primary/primaryLight/primaryDark/accent/dark/darkLight/fontFamily）
 *  - style：风格元数据（字体栈/圆角/阴影/区块间距/视觉语言）
 *  - layout：布局偏好（header 风格/hero 风格/卡片风格/CTA 风格）
 *  - industry：适用行业标签（用于行业包推荐）
 *  - fonts：字体栈（中英文）
 */
export interface TemplatePreset {
  slug: string;
  name: string;
  nameEn: string;
  category: "科技" | "工业" | "高端" | "医疗" | "教育" | "电商" | "金融" | "地产" | "餐饮" | "文化";
  description: string;
  descriptionEn: string;
  /** 主色定义（hex） */
  theme: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    dark: string;
    darkLight: string;
    fontFamily: string;
  };
  /** 风格元数据 */
  style: {
    radius: string;        // 圆角风格：sharp(0-4px)/medium(8-12px)/round(16px+)
    shadow: "soft" | "medium" | "hard" | "none";
    spacing: "compact" | "normal" | "spacious";
    visual: string;        // 视觉语言描述
    fontScale: "small" | "normal" | "large";
    hero: "full" | "split" | "centered" | "overlay";
    header: "transparent" | "solid" | "glass";
    card: "flat" | "bordered" | "elevated" | "gradient";
    cta: "solid" | "outline" | "gradient" | "ghost";
    /**
     * 标题字重（.tpl-title 钩子）—— 2026-09-15 新增字段。
     * 背景：原本有 3 条**写死模板 slug** 的 .tpl-title 字重规则被删除，
     * 因为「字重」不在 style 的既有 8 个字段里，写死 slug 无法被配置驱动。
     * 现在把它变成真实字段，由 app/layout.tsx 注入 html 的 `data-title-weight`，
     * app/globals.css 用属性选择器派发（不再出现任何写死 slug）。
     *   light  → font-weight: 300，高端/地产（t3、t8）
     *   black  → font-weight: 800，电商促销（t6）
     *   normal → 不改变组件自带字重（组件钩子自带 Tailwind `font-bold` = 700）
     * ⚠️ 该字段**可选**；省略时 app/layout.tsx 回落 "normal"（= 不改字重）。
     * 但 12 条预设**全部显式给出**，以保证每个真实取值都有 CSS 落点、可被
     * scripts/_test_style_wiring.js 的「取值覆盖」逐条核对。
     */
    titleWeight?: "light" | "normal" | "black";
  };
  /** 适用行业 */
  industries: string[];
  /** 默认启用的首页区块（按序） */
  sections: string[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // T1 深蓝科技风
  {
    slug: "t1-tech-blue",
    name: "深蓝科技风",
    nameEn: "Tech Blue",
    category: "科技",
    description: "深蓝主色 #0F62FE，适合 AI、软件、半导体、互联网科技企业，突出专业与前沿。",
    descriptionEn: "Deep blue #0F62FE for AI/software/semiconductor/internet tech firms, professional and cutting-edge.",
    theme: {
      primary: "#0F62FE",
      primaryLight: "#4589FF",
      primaryDark: "#0B4DD1",
      accent: "#42BE65",
      dark: "#161616",
      darkLight: "#262626",
      fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "medium",
      shadow: "soft",
      spacing: "normal",
      visual: "冷色系、几何线条、科技感渐变、数据可视化点缀",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "full",
      header: "glass",
      card: "bordered",
      cta: "solid",
    },
    industries: ["人工智能", "半导体", "软件", "互联网"],
    sections: ["hero", "stats", "products", "features", "industries", "cases", "about", "services", "cta"],
  },
  // T2 工业智造风（当前默认）
  {
    slug: "t2-industrial",
    name: "工业智造风",
    nameEn: "Industrial",
    category: "工业",
    description: "藏青 + 工业橙，适合装备制造、精密设备、工业阀门等高端制造企业。",
    descriptionEn: "Navy + industrial orange for equipment manufacturing, precision machinery, new energy and advanced materials.",
    theme: {
      primary: "#CC0000",
      primaryLight: "#E53935",
      primaryDark: "#990000",
      accent: "#C0C0C0",
      dark: "#111111",
      darkLight: "#1F1F1F",
      fontFamily: "'Roboto', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "medium",
      shadow: "medium",
      spacing: "normal",
      visual: "工业重色、金属质感、硬朗边框、参数化卡片",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "overlay",
      header: "solid",
      card: "elevated",
      cta: "solid",
    },
    industries: ["装备制造", "精密设备", "新能源", "新材料", "半导体设备"],
    sections: ["hero", "products", "features", "stats", "industries", "cases", "services", "about", "cta"],
  },
  // T3 炭黑银灰高端风
  {
    slug: "t3-carbon-black",
    name: "炭黑银灰高端风",
    nameEn: "Carbon Black",
    category: "高端",
    description: "炭黑 + 银灰，奢华内敛，适合高端定制、奢侈品、尖端科研机构。",
    descriptionEn: "Carbon black + silver gray, luxury and restrained for high-end customization and research.",
    theme: {
      primary: "#1A1A1A",
      primaryLight: "#333333",
      primaryDark: "#000000",
      accent: "#C0C0C0",
      dark: "#0A0A0A",
      darkLight: "#1C1C1C",
      fontFamily: "'Montserrat', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "sharp",
      shadow: "hard",
      spacing: "spacious",
      visual: "黑白灰极简、大留白、细线条、奢华质感",
      fontScale: "large",
      titleWeight: "light",
      hero: "centered",
      header: "transparent",
      card: "flat",
      cta: "outline",
    },
    industries: ["高端定制", "奢侈品", "科研", "精密仪器"],
    sections: ["hero", "about", "features", "products", "cases", "stats", "services", "cta"],
  },
  // T4 医疗纯净风
  {
    slug: "t4-medical",
    name: "医疗纯净风",
    nameEn: "Medical",
    category: "医疗",
    description: "浅蓝 + 纯净白，清爽可信，适合医疗、生物科技、健康产业。",
    descriptionEn: "Light blue + pure white, clean and trustworthy for healthcare and biotech.",
    theme: {
      primary: "#0088CC",
      primaryLight: "#33A6DD",
      primaryDark: "#00699E",
      accent: "#52C41A",
      dark: "#1C2B36",
      darkLight: "#2A3D4C",
      fontFamily: "'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "round",
      shadow: "soft",
      spacing: "spacious",
      visual: "浅色系、圆润卡片、柔和阴影、健康亲和",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "split",
      header: "glass",
      card: "elevated",
      cta: "solid",
    },
    industries: ["医疗", "生物科技", "健康", "制药"],
    sections: ["hero", "stats", "about", "features", "products", "services", "cta"],
  },
  // T5 教育清新风
  {
    slug: "t5-education",
    name: "教育清新风",
    nameEn: "Education",
    category: "教育",
    description: "活力蓝 + 清新绿，适合教育培训、学术机构、在线课程平台。",
    descriptionEn: "Vivid blue + fresh green for education, academia and online courses.",
    theme: {
      primary: "#2F80ED",
      primaryLight: "#56A0F5",
      primaryDark: "#1F5FB8",
      accent: "#27AE60",
      dark: "#2D3A4A",
      darkLight: "#3B4C60",
      fontFamily: "'Quicksand', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "round",
      shadow: "soft",
      spacing: "spacious",
      visual: "明亮色彩、圆角、插画感、轻松氛围",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "split",
      header: "solid",
      card: "bordered",
      cta: "solid",
    },
    industries: ["教育", "培训", "学术", "在线课程"],
    sections: ["hero", "features", "stats", "products", "about", "cases", "cta"],
  },
  // T6 电商明亮营销风
  {
    slug: "t6-ecommerce",
    name: "电商明亮营销风",
    nameEn: "E-commerce",
    category: "电商",
    description: "橙红 + 亮黄，活力促销，适合电商、消费品牌、快消品。",
    descriptionEn: "Orange-red + bright yellow, energetic and promotional for e-commerce and consumer brands.",
    theme: {
      primary: "#FF6B35",
      primaryLight: "#FF8C5A",
      primaryDark: "#E04E1A",
      accent: "#FFC53D",
      dark: "#2B2118",
      darkLight: "#3D2F23",
      fontFamily: "'Poppins', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "round",
      shadow: "medium",
      spacing: "compact",
      visual: "高饱和度、促销标签、大按钮、商品化展示",
      fontScale: "normal",
      titleWeight: "black",
      hero: "full",
      header: "solid",
      card: "gradient",
      cta: "gradient",
    },
    industries: ["电商", "消费品牌", "快消", "零售"],
    sections: ["hero", "products", "features", "cases", "stats", "services", "cta"],
  },
  // T7 金融稳重风
  {
    slug: "t7-finance",
    name: "金融稳重风",
    nameEn: "Finance",
    category: "金融",
    description: "藏蓝 + 金色，稳重可信，适合银行、证券、投资、保险。",
    descriptionEn: "Navy + gold, stable and trustworthy for banking, securities and insurance.",
    theme: {
      primary: "#003366",
      primaryLight: "#1A4D7A",
      primaryDark: "#002244",
      accent: "#C9A227",
      dark: "#14212E",
      darkLight: "#1E3040",
      fontFamily: "'Lato', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "sharp",
      shadow: "hard",
      spacing: "normal",
      visual: "沉稳色调、方正版式、数据仪表感、金色点缀",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "split",
      header: "solid",
      card: "bordered",
      cta: "solid",
    },
    industries: ["银行", "证券", "投资", "保险", "金融科技"],
    sections: ["hero", "stats", "about", "products", "features", "cases", "cta"],
  },
  // T8 地产大气风
  {
    slug: "t8-realestate",
    name: "地产大气风",
    nameEn: "Real Estate",
    category: "地产",
    description: "深棕 + 米金，大气沉稳，适合地产、建筑、城市更新。",
    descriptionEn: "Deep brown + beige gold, grand and steady for real estate and architecture.",
    theme: {
      primary: "#6B4226",
      primaryLight: "#8A5A38",
      primaryDark: "#4E2F1A",
      accent: "#C9A227",
      dark: "#2C2018",
      darkLight: "#3D2E22",
      fontFamily: "'Playfair Display', 'PingFang SC', 'Microsoft YaHei', serif",
    },
    style: {
      radius: "sharp",
      shadow: "hard",
      spacing: "spacious",
      visual: "大地色系、大图展示、厚重质感、项目展示式",
      fontScale: "large",
      titleWeight: "light",
      hero: "full",
      header: "transparent",
      card: "flat",
      cta: "outline",
    },
    industries: ["地产", "建筑", "城市更新", "物业"],
    sections: ["hero", "about", "cases", "stats", "products", "services", "cta"],
  },
  // T9 餐饮温馨风
  {
    slug: "t9-restaurant",
    name: "餐饮温馨风",
    nameEn: "Restaurant",
    category: "餐饮",
    description: "暖红 + 米黄，温馨食欲，适合餐饮、食品、烘焙、茶饮连锁。",
    descriptionEn: "Warm red + cream, cozy and appetizing for restaurants and food brands.",
    theme: {
      primary: "#E8622C",
      primaryLight: "#F0804F",
      primaryDark: "#C24A1E",
      accent: "#F2C94C",
      dark: "#3B2A20",
      darkLight: "#4F392B",
      fontFamily: "'Merriweather', 'PingFang SC', 'Microsoft YaHei', serif",
    },
    style: {
      radius: "round",
      shadow: "soft",
      spacing: "compact",
      visual: "暖色系、圆润、食物摄影、食欲氛围",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "centered",
      header: "solid",
      card: "elevated",
      cta: "gradient",
    },
    industries: ["餐饮", "食品", "烘焙", "茶饮", "连锁"],
    sections: ["hero", "about", "features", "products", "cases", "cta"],
  },
  // T10 文化创意风
  {
    slug: "t10-creative",
    name: "文化创意风",
    nameEn: "Creative",
    category: "文化",
    description: "靛紫 + 品红，艺术个性，适合文创、设计、传媒、影视娱乐。",
    descriptionEn: "Indigo + magenta, artistic and unique for creative, design and media.",
    theme: {
      primary: "#7B2FF7",
      primaryLight: "#9D5DFF",
      primaryDark: "#5E1FD0",
      accent: "#FF5CA8",
      dark: "#22163A",
      darkLight: "#32214F",
      fontFamily: "'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "round",
      shadow: "soft",
      spacing: "spacious",
      visual: "渐变紫粉、创意图形、艺术排版、大胆配色",
      fontScale: "large",
      titleWeight: "normal",
      hero: "split",
      header: "glass",
      card: "gradient",
      cta: "gradient",
    },
    industries: ["文创", "设计", "传媒", "影视", "娱乐"],
    sections: ["hero", "about", "cases", "features", "products", "stats", "cta"],
  },
  // T11 UNILOK 精密工业风（韩国 UNILOK 阀门企业官网风格）
  {
    slug: "unilok-industrial",
    name: "UNILOK 精密工业风",
    nameEn: "Unilok Industrial",
    category: "工业",
    description: "深蓝主色 + 橙红点缀，白底洁净室质感，模仿韩国 UNILOK 阀门企业官网：全宽 Hero 轮播、大字标题+小字 eyebrow、L 形角标装饰、线框图标能力卡片、产品参数表，适合高端阀门/流体控制/半导体设备企业。",
    descriptionEn: "Deep blue + orange-red accent, white cleanroom aesthetic, inspired by Korean UNILOK valve manufacturer: full-width hero carousel, large headlines with small eyebrow text, L-shaped corner accents, line-icon capability cards, product spec tables. Ideal for high-end valves/fluid control/semiconductor equipment.",
    theme: {
      primary: "#0F3460",
      primaryLight: "#1A4B8C",
      primaryDark: "#0A2540",
      accent: "#E84C22",
      dark: "#1A1A2E",
      darkLight: "#2D2D44",
      fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "sharp",
      shadow: "soft",
      spacing: "spacious",
      visual: "白底洁净室质感、深蓝主色、橙红点缀、L 形角标、线框图标、大字标题、技术图纸叠加",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "full",
      header: "solid",
      card: "bordered",
      cta: "solid",
    },
    industries: ["阀门", "流体控制", "半导体", "精密制造", "氢能", "生物医药"],
    sections: ["hero", "whoweare", "capabilities", "products", "industries", "news", "cta"],
  },
  // T12 洁净科技风（kitz-clean，日式洁净工业风）
  {
    slug: "kitz-clean",
    name: "洁净科技风",
    nameEn: "Clean Tech",
    category: "工业",
    description: "深蓝主色 + 青碧点缀，白底洁净室质感，日式精密工业风：全宽 Hero、大字标题 + 小字 eyebrow、L 形角标装饰、线框图标能力卡片、产品参数表，适合半导体、流体控制、洁净室设备、精密制造、新材料企业。",
    descriptionEn: "Deep blue with teal accent, white cleanroom aesthetic, Japanese precision-industrial style: full-width hero, large headlines with small eyebrow text, L-shaped corner accents, line-icon capability cards, product spec tables. Ideal for semiconductor, fluid control, cleanroom equipment, precision manufacturing and new materials.",
    theme: {
      primary: "#123A6B",
      primaryLight: "#2A5C99",
      primaryDark: "#0B2748",
      accent: "#0E7C86",
      dark: "#111827",
      darkLight: "#374151",
      fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    style: {
      radius: "sharp",
      shadow: "soft",
      spacing: "spacious",
      visual: "白底洁净室质感、深蓝主色、青碧点缀、细线条、L 形角标、线框图标、大字标题、技术图纸叠加",
      fontScale: "normal",
      titleWeight: "normal",
      hero: "full",
      header: "solid",
      card: "bordered",
      cta: "solid",
    },
    industries: ["半导体", "流体控制", "洁净室设备", "精密制造", "新材料"],
    sections: ["hero", "whoweare", "capabilities", "products", "industries", "news", "cta"],
  },
];

export const TEMPLATE_PRESET_MAP: Record<string, TemplatePreset> = Object.fromEntries(
  TEMPLATE_PRESETS.map((t) => [t.slug, t])
);

/** 默认模板（当前存量站点使用，即工业智造风 T2） */
export const DEFAULT_TEMPLATE_SLUG = "t2-industrial";

/**
 * 「整站版式模板」slug 白名单
 * ---------------------------------------------
 * 指**自带独立组件树与页面派发分支**、应用后**整页替换**前台版式的模板；
 * 其余预设只是替换 theme 配色 + style CSS 变量，共用同一套版式组件（「配色皮肤」）。
 * 后台「模板管理」页据此把两者分成不同层级展示。
 * ⚠️ 新增版式模板时**必须同步在此登记**，否则会被归入「配色皮肤」。
 */
export const FULL_LAYOUT_SLUGS = ["unilok-industrial", "kitz-clean"];

/** 获取模板预设 */
export function getTemplatePreset(slug: string): TemplatePreset {
  return TEMPLATE_PRESET_MAP[slug] || TEMPLATE_PRESET_MAP[DEFAULT_TEMPLATE_SLUG];
}

/** 将模板主题应用到 ThemeConfig 字段 */
export function presetToThemeConfig(preset: TemplatePreset) {
  return {
    primary: preset.theme.primary,
    primaryLight: preset.theme.primaryLight,
    primaryDark: preset.theme.primaryDark,
    accent: preset.theme.accent,
    dark: preset.theme.dark,
    darkLight: preset.theme.darkLight,
    fontFamily: preset.theme.fontFamily,
  };
}
