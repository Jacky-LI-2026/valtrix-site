"use client";

// 通知已读状态统一持久化（localStorage）
// 顶部铃铛与通知历史页共享同一套已读记录，跨页面同步
const STORAGE_KEY = "valtrix_admin_notifications_read";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
