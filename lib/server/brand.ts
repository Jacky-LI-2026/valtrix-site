/**
 * 服务端品牌信息统一入口（**仅限服务端**：Route Handler / Server Action / 定时任务）
 * =====================================================
 * 背景（双 fork 合并 D1 = 单码多库）：
 *   同一份代码服务多个独立部署，各站品牌名与邮箱不同。
 *   **代码里绝不能写死某一站的品牌名/邮箱**（G2）——
 *   否则阀门站发出的订单邮件会顶着"左文科技"的名头、把回信地址指到别家公司。
 *
 * 取值优先级：
 *   1) **数据库**（`seo_config.siteName/siteNameEn`、`site_config.contact_info.email`）—— 后台可视化维护，运行时真源
 *   2) **部署级环境变量**（`NEXT_PUBLIC_BRAND_NAME` / `NEXT_PUBLIC_CONTACT_EMAIL` / `SHOP_ORDER_NOTICE_EMAIL`）
 *   3) **空字符串** —— 宁可不显示，也绝不回退成另一家公司的品牌/邮箱
 *
 * ⚠️ 本模块读取 Prisma 与请求头（`getSEOConfig()` 内部会做租户解析），
 *    **不得被客户端组件引用**；客户端可用的兜底在 `lib/brand.ts`（只读 NEXT_PUBLIC_* 环境变量）。
 */
import { prisma } from "@/lib/prisma";
import { getSEOConfig } from "@/lib/seo";
import { getContactEmail, getShopNoticeEmail } from "@/lib/brand";

export interface BrandInfo {
  /** 中文品牌名（邮件抬头、发件人显示名、邮件主题前缀） */
  name: string;
  /** 英文品牌名（邮件抬头副标题） */
  nameEn: string;
  /** 通用联系邮箱（邮件页脚"如需帮助请联系…"） */
  contactEmail: string;
  /** 商城订单通知收件人（为空时**必须跳过发送并告警**，不得发给占位/错误的收件人） */
  shopNoticeEmail: string;
}

/** 读取 contact_info.email（前台真实消费的联系邮箱配置） */
async function readContactInfoEmail(): Promise<string> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { configKey: "contact_info" },
      select: { configValue: true },
    });
    const v = row?.configValue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const email = (v as Record<string, unknown>).email;
      if (typeof email === "string" && email.trim()) return email.trim();
    }
  } catch {
    // DB 读取失败则回退环境变量
  }
  return "";
}

/**
 * 获取当前部署的品牌信息（DB → 环境变量 → 空串）。
 * 任意一环失败都不抛出，保证下单/通知主流程不被邮件配置问题阻断。
 */
export async function getBrandInfo(): Promise<BrandInfo> {
  const envName = String(process.env.NEXT_PUBLIC_BRAND_NAME || "").trim();

  let name = envName;
  let nameEn = "";
  try {
    const seo = await getSEOConfig();
    const sn = String(seo?.siteName ?? "").trim();
    const snEn = String(seo?.siteNameEn ?? "").trim();
    // "企业官网" 是 tenant/context 的无站点兜底占位，不应作为品牌名出现在邮件里
    if (sn && sn !== "企业官网") name = sn;
    if (snEn) nameEn = snEn;
  } catch {
    // DB/租户解析失败：沿用环境变量
  }

  const dbEmail = await readContactInfoEmail();

  return {
    name,
    nameEn,
    contactEmail: dbEmail || getContactEmail(),
    // 收件人优先环境变量（运维显式指定），其次 DB 联系邮箱
    shopNoticeEmail: getShopNoticeEmail() || dbEmail,
  };
}

/** 邮件抬头文案：有中文名+英文名则并列，缺一则只显示有的那个 */
export function brandLetterhead(b: BrandInfo): string {
  return [b.name, b.nameEn].filter(Boolean).join(" ");
}

/** 邮件主题前缀：品牌名为空时退化为无前缀，避免出现" - 订单提交成功"这种残缺标题 */
export function brandSubjectPrefix(b: BrandInfo): string {
  return b.name ? `${b.name} - ` : "";
}
