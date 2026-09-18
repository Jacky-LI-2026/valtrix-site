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
