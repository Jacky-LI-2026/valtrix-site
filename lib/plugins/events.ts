/**
 * 插件事件总线（Event Bus）
 * =====================================================
 * 插件间/系统内异步联动：发布事件（emit），订阅者（on）收到后执行。
 * - 解耦：发布者不知道谁在听，订阅者可以多个、可增删
 * - 内置事件（命名空间 content./lead./file./system.）：
 *   content.published  { type, id, slug, locale? }   内容发布/更新
 *   content.deleted    { type, id }
 *   lead.submitted     { channel, data }             留资/询价/预约等商机提交
 *   file.uploaded      { url, kind }                 媒体上传
 *   system.startup     {}                            服务启动（用于插件初始化/建表）
 * 幂等订阅：同一 (event, listener) 只注册一次。
 */
type EventListener = (payload: any) => Promise<void> | void;

const listeners = new Map<string, Set<EventListener>>();

/** 订阅事件（幂等） */
export function on(event: string, listener: EventListener): void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(listener);
}

/** 取消订阅 */
export function off(event: string, listener: EventListener): void {
  listeners.get(event)?.delete(listener);
}

/** 发布事件：await 所有订阅者（串行，失败不阻断后续，错误打印到服务日志） */
export async function emit(event: string, payload?: any): Promise<void> {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;
  for (const fn of Array.from(set)) {
    try {
      await fn(payload);
    } catch (e) {
      console.error(`[events] 事件 ${event} 订阅者执行失败:`, e);
    }
  }
}

/** 列出已订阅事件 */
export function listEvents(): string[] {
  return Array.from(listeners.keys());
}
