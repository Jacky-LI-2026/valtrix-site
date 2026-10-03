/**
 * 品牌 / 联系方式配置（部署级单一来源）
 * =====================================================
 * 背景（双 fork 合并 D1 = 单码多库）：
 *   基地同一份代码服务多个**独立部署**，各站品牌与联系方式不同 ——
 *   **代码里绝不能硬编码他站的邮箱/电话/品牌名**。
 *
 * 取值优先级：
 *   运行时以 **数据库** 为准（`site_config.contact_info` / `seo_config`，由后台可视化维护）；
 *   本模块只提供**兜底值**，供数据库未配置时使用，来自部署级环境变量：
 *
 *     NEXT_PUBLIC_CONTACT_EMAIL="info@example.com"   # 通用联系/前台展示兜底
 *     NEXT_PUBLIC_CONTACT_PHONE="+86 138-0000-0000"  # 通用联系电话/前台展示兜底
 *     SHOP_ORDER_NOTICE_EMAIL="orders@example.com"   # 商城订单通知收件人
 *
 * ⚠️ 兜底**故意为空串**而不是写死某个域名/号码：
 *   宁可不显示，也不能把客户引导到**别家公司**的邮箱或电话（这比留空严重得多）。
 *   `getShopNoticeEmail()` 返回空时，调用方应**跳过发送并告警**，而不是发给错的人。
 *   `getContactPhone()` 返回空时，调用方应**不渲染**电话（含 `tel:` 链接），
 *   而不是退化成无效的 `href="tel:"`。
 */

/**
 * 品牌名兜底（同步、可在模块作用域/客户端安全使用）
 * 服务端需要「DB 优先」的品牌名时用 `lib/server/brand.ts` 的 `getBrandInfo()`
 */
export function getBrandName(): string {
  return String(process.env.NEXT_PUBLIC_BRAND_NAME || "").trim();
}

/** 英文品牌名兜底；未单独配置时回退中文品牌名 */
export function getBrandNameEn(): string {
  return String(process.env.NEXT_PUBLIC_BRAND_NAME_EN || process.env.NEXT_PUBLIC_BRAND_NAME || "").trim();
}

/**
 * 品牌名的**大小写变体**（去重、滤空）。
 *
 * 为什么需要 —— **已实测，不是推测**（对 `D:\阀门网站` 只读核实）：
 * 两个 fork 的历史键/密钥大小写约定不一致，**且同一站点内部也不一致**：
 *
 *   | 阀门站位置                  | 实际字面量                         | 大小写 |
 *   |-----------------------------|------------------------------------|--------|
 *   | `lib/i18n.tsx`              | `VALTRIX-locale`                   | 大写   |
 *   | `lib/download-gate.ts`      | `VALTRIX-download-verified`        | 大写   |
 *   | `lib/notifications-read.ts` | `valtrix_admin_notifications_read` | 小写   |
 *   | `lib/member-token.ts`       | `valtrix-member-token`             | 小写   |
 *
 * 即：**只派生原样品牌名的话，上表后两条会迁移失败** —— 阀门站老用户会
 * 丢通知已读状态，并被强制登出。两种变体都是「该部署的品牌名」的派生，
 * **不是硬编码**，故一并产出。
 */
export function brandNameVariants(): string[] {
  const name = getBrandName();
  if (!name) return [];
  const out = new Set<string>([name]);
  const lower = name.toLowerCase();
  if (lower) out.add(lower);
  return Array.from(out);
}

/**
 * 构造「品牌前缀 + 固定后缀」的**历史键/密钥候选集**（AGENTS.md G2 的配套工具）。
 *
 * 用途：把 localStorage 键、cookie 兜底密钥等**品牌中立化**之后，仍需**读取**老用户
 * 存在旧键下的数据（否则改键名会让老用户丢一次设置/被登出）。
 *
 * 关键设计：旧键**从品牌名派生**，而不是写死品牌 —— 同一份 Base 代码部署到不同站点时，
 * 各部署自动得到**自己**的旧键（阀门站 → `VALTRIX-*`，基地 → `左文科技-*`），
 * 代码里一个品牌名都不出现。
 *
 * @param suffix 固定后缀，如 `-locale`
 * @param extra  额外的**显式历史字面量**（仅限非品牌名形式的旧键，如拉丁 slug `zuowen-xxx`；
 *               调用处必须写明 TODO 与删除前提）。空串会被忽略。
 * @returns 去重后的候选列表；品牌名为空时不会生成 `-locale` 这类残缺键
 */
export function legacyBrandPrefixedKeys(suffix: string, extra: string[] = []): string[] {
  const out = new Set<string>();
  for (const v of brandNameVariants()) {
    const k = `${v}${suffix}`;
    // 品牌名为空（或恰等于后缀）时跳过，避免生成 "-locale" 这种残缺键
    if (k !== suffix && k.replace(suffix, "") !== "") out.add(k);
  }
  for (const e of extra) {
    const v = String(e || "").trim();
    if (v) out.add(v);
  }
  return Array.from(out);
}

/**
 * 行业关键词（供 AI 报价/新闻提示词使用），逗号分隔（中英文逗号均可）
 * 例：NEXT_PUBLIC_INDUSTRY_TERMS="工业阀门,流体控制元件,闸阀,球阀,蝶阀"
 */
export function getIndustryTerms(): string[] {
  return String(process.env.NEXT_PUBLIC_INDUSTRY_TERMS || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 行业描述短语 —— **代码里不得写死某站的行业**（双 fork 共用一份代码）。
 * 已配置词表 → 用词表；未配置 → 回退中性表述（宁可不具体，也不能把阀门站说成金刚石站）。
 */
export function industryDesc(fallback = "本公司产品与相关行业"): string {
  const t = getIndustryTerms();
  return t.length ? t.join("、") : fallback;
}

/** 通用联系邮箱兜底（DB contact_info.email 为空时使用） */
export function getContactEmail(): string {
  return String(process.env.NEXT_PUBLIC_CONTACT_EMAIL || "").trim();
}

/**
 * 通用联系电话兜底（DB contact_info.phone 为空时使用）
 *
 * 环境变量：`NEXT_PUBLIC_CONTACT_PHONE`（部署级，见 AGENTS.md G2）
 *
 * ⚠️ 兜底**故意为空串**（与 `getContactEmail()` 完全同构，不是遗漏默认值）：
 *   本项目是「一份 Base 代码 + 多个独立部署」（基地站 / 阀门站），
 *   在共享组件里写死任何一家的号码，都会在**另一个站点**的 DB 尚未配置时
 *   把**别家公司**的电话印到页面上 —— 那比留空严重得多。
 *   宁可不显示。
 *
 * 调用方契约：返回空串时必须**不渲染**电话，包括**不要**生成 `tel:` 链接
 *   （空号码会退化成无效的 `href="tel:"`）；有值时渲染结果与旧硬编码版本一致。
 */
export function getContactPhone(): string {
  return String(process.env.NEXT_PUBLIC_CONTACT_PHONE || "").trim();
}

/** 招聘邮箱兜底（DB contact_info.recruitEmails 为空时使用） */
export function getRecruitEmail(): string {
  return String(process.env.NEXT_PUBLIC_RECRUIT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "").trim();
}

/** 商城订单通知收件人兜底（DB/环境变量均未配置时返回空 → 调用方应跳过发送） */
export function getShopNoticeEmail(): string {
  return String(process.env.SHOP_ORDER_NOTICE_EMAIL || "").trim();
}
