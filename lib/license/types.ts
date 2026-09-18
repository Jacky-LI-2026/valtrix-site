/**
 * 商用授权 - 数据类型
 * 授权码 = base64url(payload) + "." + base64url(signature)
 * payload 为 LicensePayload 的 JSON 序列化
 */
export interface LicensePayload {
  /** 客户标识（公司名/客户ID） */
  cid: string;
  /** 绑定域名列表（空数组 = 不限制域名） */
  domains: string[];
  /** 版本：trial / pro / enterprise */
  edition: "trial" | "pro" | "enterprise";
  /** 到期时间戳（秒）；0 = 永久 */
  exp: number;
  /** 签发时间戳（秒） */
  issued: number;
  /** 授权站点数 */
  seats: number;
}

/** 已激活的授权信息（存储在 data/license.json） */
export interface LicenseRecord {
  cid: string;
  domains: string[];
  edition: string;
  exp: number;
  issued: number;
  seats: number;
  /** 激活时间 */
  activatedAt: string;
  /** 原始授权码 */
  code: string;
}

export const EDITION_LABELS: Record<string, string> = {
  trial: "试用版",
  pro: "专业版",
  enterprise: "旗舰版",
};
