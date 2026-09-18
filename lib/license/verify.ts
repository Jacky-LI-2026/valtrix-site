/**
 * 商用授权 - 验签与校验（纯离线，无需联网）
 */
import crypto from "crypto";
import { LICENSE_PUBLIC_KEY } from "./keys";
import type { LicensePayload } from "./types";

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64");
}

/**
 * 签名一段 payload（授权方工具用，传入私钥）
 */
export function signPayload(payload: LicensePayload, privateKey: string): string {
  const payloadStr = JSON.stringify(payload);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(payloadStr);
  signer.end();
  const sig = signer.sign(privateKey);
  return `${b64urlEncode(Buffer.from(payloadStr, "utf8"))}.${b64urlEncode(sig)}`;
}

export interface VerifyResult {
  ok: boolean;
  payload?: LicensePayload;
  error?: string;
  /** 是否已过期 */
  expired?: boolean;
}

/**
 * 校验授权码（系统侧）：
 * 1. 拆分 payload + 签名
 * 2. 公钥验签（防伪造/篡改）
 * 3. 返回 payload，供调用方继续做域名/过期校验
 */
export function verifyLicenseCode(code: string): VerifyResult {
  try {
    const parts = code.trim().split(".");
    if (parts.length !== 2) return { ok: false, error: "授权码格式错误" };

    const payloadBuf = b64urlDecode(parts[0]);
    const sigBuf = b64urlDecode(parts[1]);
    const payloadStr = payloadBuf.toString("utf8");

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payloadStr);
    verifier.end();
    const valid = verifier.verify(LICENSE_PUBLIC_KEY, sigBuf);
    if (!valid) return { ok: false, error: "授权码签名无效（可能被篡改）" };

    const payload = JSON.parse(payloadStr) as LicensePayload;
    if (!payload.cid || !payload.edition) {
      return { ok: false, error: "授权码内容不完整" };
    }
    return { ok: true, payload };
  } catch (e: any) {
    return { ok: false, error: "授权码解析失败：" + (e.message || "未知错误") };
  }
}

/**
 * 校验当前域名是否在授权域名列表内。
 * payload.domains 为空数组 => 不限制域名，返回 true。
 * 比较时忽略协议、路径与端口（localhost:3000 视为 localhost）。
 */
export function isDomainAllowed(payload: LicensePayload, currentDomain: string): boolean {
  if (!payload.domains || payload.domains.length === 0) return true;
  const normalize = (d: string) =>
    d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  const cur = normalize(currentDomain);
  return payload.domains.some((d) => normalize(d) === cur);
}

/**
 * 是否已过期。exp=0 表示永久授权。
 */
export function isExpired(payload: LicensePayload, now = Date.now()): boolean {
  return payload.exp > 0 && now > payload.exp * 1000;
}
