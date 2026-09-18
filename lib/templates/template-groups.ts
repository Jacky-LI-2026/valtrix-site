/**
 * 模板分层 / 筛选 / 标签 —— 纯函数模块
 * =====================================================
 * 后台「模板管理」页（app/admin/templates/page.tsx）一页平铺了三類数据，
 * 但它们其实分属**不同层级**，本模块只负责把「分区 / 功能标签 / 搜索匹配」
 * 这些**纯逻辑**抽出来，便于 node/tsx 直接单测：
 *
 *   - layout  整站版式模板：自带独立组件树与页面派发，应用后整页替换前台版式
 *   - skin    配色皮肤：共用同一套前台版式，只换 theme 配色 + style CSS 变量
 *   - pack    行业数据包：一键初始化站点（模板 + 首页区块顺序 + SEO + 默认文案）
 *   - custom  我的模板：DB 里自行新增 / 导入 / 从预设复制保存的模板
 *
 * ⚠️ 边界：本文件**不依赖 React、不依赖 window、不读 DB、不读任何枚举外的数据**。
 *
 * 🔴 关于分组键的取舍（已核实，勿改回）：
 *   - `preset.category` 有 10 个取值、10 组里 9 组只有 1 条 → 分组收益极低，**不做分区键**；
 *   - `preset.sections` 全项目零读取方（死字段）→ **不做分组键**；
 *   - `preset.industries` 后台不读（唯一读取点在前台 app/template-preview/page.tsx）→ **不做分组键**；
 *   - 唯一「有数据 + 已被真实消费」的功能维度是 `preset.style`（由此派生功能标签）。
 */

export type TemplateTier = "layout" | "skin" | "pack" | "custom";

/** 层级显示顺序（渲染与测试都以此为准） */
export const TIER_ORDER: TemplateTier[] = ["layout", "skin", "pack", "custom"];

/** 层级显示名 */
export const TIER_LABEL: Record<TemplateTier, string> = {
  layout: "整站版式模板",
  skin: "配色皮肤",
  pack: "行业数据包",
  custom: "模板登记记录",
};

/**
 * 层级一句话说明（解释「这一层为什么不一样」）。
 * ⚠️ 这里的措辞是**按实测口径**写的，不要写回"想当然"的版本：
 *   · `skin` 曾在文案里写「替换圆角/间距/阴影等 CSS 变量」—— 那几项**未接线**，已改掉；
 *   · `custom` 曾写作「我的模板（副本）…不参与前台渲染」—— **这是错的**（2026-09-15 用户报「显示状态冲突」）：
 *     应用任何预设时 `applyPreset` 都会往 `templates` 表 upsert 一条登记行，**那条就是当前前台模板**；
 *     只有「存为我的模板 / 导入」产生的副本才不参与渲染。一刀切的说明会让同一屏自相矛盾。
 */
export const TIER_HINT: Record<TemplateTier, string> = {
  layout: "自带独立组件树与页面派发，应用后整页替换前台版式（自带配色）",
  skin: "共用同一套前台版式；替换配色、字体与圆角/阴影/间距/字阶/首屏/卡片/页头/按钮/标题字重；「只应用配色」不动当前模板",
  pack: "一键初始化站点：切换模板 + 首页区块顺序 + SEO + 默认文案",
  custom: "应用预设时自动写入的登记行 +「存为我的模板 / 导入」产生的副本 —— 两类混在一起，见下方说明",
};

/**
 * 「模板登记记录」这一层的实话（供 UI 直接展示）。
 * ⚠️ 2026-09-15 修正：原版写的是「这一层不影响前台」，**与同屏的「当前使用中」徽章直接冲突**
 *    （用户报的「显示状态冲突」）。事实是这一层**混了两类东西**，必须分开说。
 */
export const CUSTOM_NOTE =
  "这一层混了两类：① **应用预设时自动写入的登记行** —— 其中标着「当前应用」的那条**就是当前前台模板**；" +
  "② 「存为我的模板 / 导入」产生的**副本** —— 副本的 slug 不在页面的模板派发分支里，" +
  "就算把它设为默认或启用**也不会改变前台**（要换前台请用上面的「整站版式模板」）。" +
  "同一条登记行上的「默认 / 启用」只表示登记状态，与前台是否正在使用它无关 —— 以「当前应用」为准。";

/**
 * 判断某个预设属于哪一层。
 * 命中「整站版式模板白名单」→ layout，否则一律视为共用版式的配色皮肤（skin）。
 */
export function tierOfPreset(
  preset: { slug: string },
  fullLayoutSlugs: string[]
): TemplateTier {
  if (!preset || typeof preset.slug !== "string") return "skin";
  const whiteList = Array.isArray(fullLayoutSlugs) ? fullLayoutSlugs : [];
  return whiteList.includes(preset.slug) ? "layout" : "skin";
}

/** 预设 `theme` 的字段**是否真的影响前台**（2026-09-15 实测）。 */
// 依据：`tailwind.config.ts` 把 `primary/accent/dark` 映射到 `var(--color-primary)` 等，
//       `app/layout.tsx` 把 themeConfig 注入 `<html>`；`globals.css:36` 用 `--tpl-font-family` 作用于 body。
//       ⇒ 颜色与字体对所有模板（含整站版式模板）都生效。
export const THEME_WIRED: Record<string, boolean> = {
  primary: true,
  primaryLight: true,
  primaryDark: true,
  accent: true,
  dark: true,
  darkLight: true,
  fontFamily: true,
};

/**
 * 预设 `style` 的字段**是否真的影响前台**（2026-09-15 实测）。
 * ⚠️ 同日后续更新：**8 个旧字段已于当天被真正接线**（`app/globals.css` 补全属性选择器 +
 *    默认模板组件挂上 `.tpl-*` / `.btn-primary` 钩子），浏览器 A/B 实测确认生效；
 *    并**新增**了第 9 个字段 `titleWeight`（取代原先写死 slug 的字重规则）。
 *    ⇒ 这张表是「**当时的事实快照**」，不是永久真理；改接线后必须同步这里，
 *      并且 `scripts/_test_template_groups.js` 会对键集合与取值做断言。
 */
export const STYLE_WIRED: Record<string, boolean> = {
  radius: true,
  shadow: true,
  spacing: true,
  fontScale: true,
  hero: true,
  header: true,
  card: true,
  cta: true,
  titleWeight: true,
};

/**
 * ⛔ 已删除：`styleFeatureTags()`
 * =====================================================
 * 它曾把 `preset.style` 的枚举渲染成一排中文「功能标签」（全宽首屏 / 描边卡片 / 实色页头 …）。
 * **2026-09-15 实测证明：那些标签描述的是「不生效的配置」** —— 会让人以为 12 套预设之间有功能差异，
 * 实际它们**只差颜色**。故连同 `STYLE_TAG_FIELDS` / `STYLE_TAG_MAP` 一并删除。
 *
 * 证据（两条都可复现）：
 *   ① `--radius` / `--section-pad` / `--font-scale` / `--tpl-shadow` 的**唯一消费点**
 *      是 `app/globals.css` 里 `.tpl-card` / `.tpl-btn` / `.tpl-section` / `.tpl-scaled` / `.btn-primary`
 *      这几条规则；而**这些 class 名在 `app/**` 与 `components/**` 里 0 次使用**
 *      （广义搜 `tpl-` 只命中 globals.css 的定义本身，且没有任何动态拼接如 `` `tpl-${x}` ``）⇒ 孤儿 CSS。
 *   ② `data-hero-style` / `data-card-style` / `data-header-style` / `data-cta-style`
 *      只被 `app/layout.tsx:218-221` **写入**，**CSS 里 0 个属性选择器、JS 里 0 个读取方**。
 *   ⇒ `style` 的 8 个字段**没有一个真正影响前台**（对默认模板、ULILOK、KITZ 都不影响）。
 *
 * ⚠️ 后续若要真正接线，须同时改三处：组件挂上 `.tpl-*` 类（或改成直接读变量）、
 *    补 `data-*-style` 的属性选择器、并给整站版式模板定义各自的消费方式；**那是功能开发，不是配置**。
 *
 * =====================================================
 * ✅ **2026-09-15 同日已完成上述三处接线**（浏览器 A/B 实测确认：圆角 10/4/18px、
 *    区块间距 88/112/56px、字阶 1→1.08、卡片阴影 elevated 有 / flat none、cta outline 透明底+主色描边、
 *    hero split 分栏几何、header transparent 顶部透明+滚动转实、titleWeight 300/700/800 均生效）。
 *    ⇒ 上面这段「为什么不生效」的推理**作为历史保留**（它解释了当时为什么删掉功能标签），
 *      但**结论已过期**：现在 `STYLE_WIRED` 全为 `true`。
 *    ⚠️ **接线范围**：只接了**默认模板**（`components/sections/**` + `components/layout/**`）；
 *      `theme-unilok` / `theme-kitzsct` 两套整站版式模板**刻意未挂钩子**（它们自带完整设计语言）。
 */

/**
 * 一句可直接显示给后台用户的大白话说明（供 UI 复用，避免各处各写一份而漂移）。
 * ⚠️ 措辞随接线状态更新：2026-09-15 **当天先写的是「尚未接线」，随后接线完成、当天即改为现在这句**。
 *    这类"说明书"最容易过期 —— 改接线时**必须同步这里**，否则后台会继续对用户说假话。
 */
export const WIRED_NOTE =
  "配色与字体对**所有模板**生效；圆角、阴影、间距、字阶，以及首屏 / 卡片 / 页头 / 按钮 / 标题字重" +
  "对**默认版式**生效（整站版式模板如 UNILOK / KITZ 自带完整设计，不套用这些皮肤参数）。";

/** 配色皮肤与整站版式模板的关系说明（供 UI 复用）。 */
export const SKIN_NOTE =
  "配色皮肤替换**颜色、字体，以及圆角 / 阴影 / 间距 / 字阶 / 首屏 / 卡片 / 页头 / 按钮 / 标题字重**（作用于默认版式）；" +
  "「只应用配色」**不会**切换当前模板 —— 可以叠加在「整站版式模板」之上，版式保持不动；" +
  "若确实想连版式一起切到该皮肤本身（即切回它的默认版式），用次要按钮「切换为此模板」。";

/**
 * 关键字匹配：名称 / nameEn / slug / 描述等**字符串字段**（大小写不敏感）。
 * - `query` 去空白后为空 → 一律 `true`；
 * - 只匹配**顶层字符串**字段；`null`/`undefined`/嵌套对象（如 theme/style）**跳过**，
 *   不递归、不抛错、也不会产生 `[object Object]` 之类的假命中。
 * - `extra`：调用方**显式**补充的额外可搜索文本（例如行业包把 `seo.title/description`
 *   摊平后传进来）。**刻意不做自动递归** —— 递归会把整棵配置树的每个值都变成命中源，
 *   搜 `#C0C0C0` 这种颜色值会误命中，且行为难以预测。
 */
export function matchesQuery(obj: Record<string, any>, query: string, extra: string[] = []): boolean {
  const q = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (q === "") return true;
  if (!obj || typeof obj !== "object") return false;
  if (
    Object.values(obj).some(
      (value) => typeof value === "string" && value.toLowerCase().includes(q)
    )
  ) {
    return true;
  }
  return extra.some((v) => typeof v === "string" && v.toLowerCase().includes(q));
}
