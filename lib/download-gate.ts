"use client";

/**
 * 下载验证本地状态管理
 *
 * 验证通过一次后，将用户填写的留资信息与验证时间保存在 localStorage。
 * 在有效期内（默认 7 天）同一浏览器再次点击下载不再要求重复验证，
 * 实现「一次验证通过，可以下载多次」。
 */

import { legacyBrandPrefixedKeys } from "@/lib/brand";

export interface DownloadProfile {
  name: string;
  company: string;
  phone: string;
  email: string;
  verifiedAt: number;
}

/**
 * 下载验证状态的 localStorage 键。
 *
 * **必须是品牌中立固定键**（AGENTS.md G2）：两个 fork 合并为同一份 Base 代码后，
 * 键名若含品牌串，A 站品牌名会被写进 B 站用户的浏览器存储。键名恒定，不随站点变。
 */
const STORAGE_KEY = "cms-download-gate";

/**
 * 历史键名（**仅用于向后兼容迁移**）。
 *
 * 品牌名从 `getBrandName()`（`NEXT_PUBLIC_BRAND_NAME`）派生，不写死品牌 ——
 * 同一份 Base 代码在不同部署上自动得到该部署自己的旧键。
 * 显式字面量为**历史 Base 键**（其生效期间 `NEXT_PUBLIC_BRAND_NAME` 未必已配置）。
 * TODO(迁移期)：存量用户回写完成后可删除显式字面量。**禁止**用作新的写入目标。
 */
const LEGACY_STORAGE_KEYS = legacyBrandPrefixedKeys("-download-verified", [
  "左文科技-download-verified", // TODO(迁移期)：存量迁移完成后可删
]);

const VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 天有效

/** 读取原始字符串：优先新键；没有则读旧键并回写新键（迁移） */
function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return current;
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const old = window.localStorage.getItem(legacyKey);
      if (old) {
        try {
          window.localStorage.setItem(STORAGE_KEY, old);
        } catch {
          /* 回写失败不影响本次读取 */
        }
        return old;
      }
    }
  } catch {
    /* localStorage 不可用时按未保存处理 */
  }
  return null;
}

/** 获取当前浏览器的已验证留资信息；未验证或已过期返回 null */
export function getDownloadProfile(): DownloadProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readRaw();
    if (!raw) return null;
    const profile = JSON.parse(raw) as DownloadProfile;
    if (!profile.email || Date.now() - profile.verifiedAt > VALIDITY_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

/** 标记验证通过并保存留资信息 */
export function markDownloadVerified(profile: Omit<DownloadProfile, "verifiedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...profile, verifiedAt: Date.now() })
    );
  } catch {
    // localStorage 不可用时忽略（如隐私模式），本次下载仍可继续
  }
}
