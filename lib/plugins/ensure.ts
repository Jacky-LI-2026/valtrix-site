/**
 * 插件引导（一次性）
 * =====================================================
 * 服务端进程内调用 registerBuiltinCapabilities() 一次，确保能力注册 + 事件订阅生效。
 * 幂等：进程内只执行一次；Next 生产多 worker 各自执行一次也无副作用
 * （registerCapability 覆盖注册、events.on 用 Set 去重）。
 */
import { registerBuiltinCapabilities, registerPluginLifecycleHooks } from "./boot";

let ensured = false;

export function ensurePlugins(): void {
  if (ensured) return;
  registerBuiltinCapabilities();
  registerPluginLifecycleHooks();
  // 注册原子 API 能力到插件能力注册表（供对外网关复用）
  try {
    const { registerAtomicCapabilities } = require("@/lib/atoms") as typeof import("@/lib/atoms");
    registerAtomicCapabilities();
  } catch (e) {
    console.warn("[plugins] 原子能力注册失败:", e);
  }
  ensured = true;
}
