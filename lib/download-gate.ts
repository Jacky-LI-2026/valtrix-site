"use client";

/**
 * 下载验证本地状态管理
 *
 * 验证通过一次后，将用户填写的留资信息与验证时间保存在 localStorage。
 * 在有效期内（默认 7 天）同一浏览器再次点击下载不再要求重复验证，
 * 实现「一次验证通过，可以下载多次」。
 */

export interface DownloadProfile {
  name: string;
  company: string;
  phone: string;
  email: string;
  verifiedAt: number;
}

const STORAGE_KEY = "VALTRIX-download-verified";
const VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 天有效

/** 获取当前浏览器的已验证留资信息；未验证或已过期返回 null */
export function getDownloadProfile(): DownloadProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
