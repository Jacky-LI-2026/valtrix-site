"use client";

import { legacyBrandPrefixedKeys } from "@/lib/brand";

// 通知已读状态统一持久化（localStorage）
// 顶部铃铛与通知历史页共享同一套已读记录，跨页面同步
//
// 键名必须是**品牌中立固定键**（AGENTS.md G2）：两个 fork 合并为同一份 Base 代码后，
// 键名若含品牌串，A 站品牌名会被写进 B 站用户的浏览器存储。
const STORAGE_KEY = "cms-notifications-read";

/**
 * 历史键名（**仅用于向后兼容迁移**）。
 *
 * 品牌名从 `getBrandName()`（`NEXT_PUBLIC_BRAND_NAME`）派生，不写死品牌 ——
 * 各部署自动得到该部署自己的旧键（如 `VALTRIX_admin_notifications_read`）。
 * 显式字面量是**历史 Base 键**：它用的是**品牌拉丁 slug**（`zuowen`）而非品牌名本身
 * （品牌名为「左文科技」），**无法由派生覆盖**，故必须显式保留。
 * TODO(迁移期)：存量用户回写完成后可删除显式字面量。**禁止**用作新的写入目标。
 */
const LEGACY_STORAGE_KEYS = legacyBrandPrefixedKeys("_admin_notifications_read", [
  "zuowen_admin_notifications_read", // TODO(迁移期)：存量迁移完成后可删
]);

type NotificationItem = {
  id: string;
  type: "message" | "system" | "collection" | "backup";
  title: string;
  content: string;
  time: string;
  read: boolean;
  link?: string;
};

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 迁移：旧键 → 新键（回写后老用户的已读集合得以延续）
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const old = window.localStorage.getItem(legacyKey);
        if (old) {
          raw = old;
          try {
            window.localStorage.setItem(STORAGE_KEY, old);
          } catch {
            /* 回写失败不影响本次读取 */
          }
          break;
        }
      }
    }
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

// 将原始通知标记为已读（本地已读集合做并集），返回合并后的列表
export function mergeReadState(list: NotificationItem[]): NotificationItem[] {
  const readIds = readSet();
  return list.map((n) => ({ ...n, read: n.read || readIds.has(String(n.id)) }));
}

// 标记单条已读
export function markNotificationRead(id: string): void {
  const set = readSet();
  set.add(String(id));
  writeSet(set);
}

// 标记全部已读
export function markAllNotificationsRead(ids: string[]): void {
  const set = readSet();
  ids.forEach((id) => set.add(String(id)));
  writeSet(set);
}

// 统计未读数量（配合已读集合）
export function countUnread(list: NotificationItem[]): number {
  const readIds = readSet();
  return list.filter((n) => !n.read && !readIds.has(String(n.id))).length;
}
