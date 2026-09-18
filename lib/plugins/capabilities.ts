/**
 * 插件能力注册表（Capability Registry / SPI）
 * =====================================================
 * 插件间通信核心：插件「声明提供能力」，其他插件/系统通过 callCapability 统一调用。
 * - 进程内函数调用（非 HTTP），调用方不关心实现方，实现方可整体替换（如翻译通道切换）
 * - 能力名约定：`<domain>.<action>`，如 smtp.send / translate.text / seo.push
 * - 未注册能力调用返回 null（调用方自行降级），不抛错
 * 与事件总线（events.ts）配合：同步能力走注册表，异步联动走事件订阅。
 */
type CapabilityHandler = (args: any, ctx?: any) => Promise<any> | any;
/** 能力元信息：public=true 表示可通过对外 API 网关（/api/integration/...）被第三方调用 */
type CapabilityMeta = { public: boolean };

const capabilities = new Map<string, CapabilityHandler>();
const capabilityMeta = new Map<string, CapabilityMeta>();

/** 注册能力（重复注册后注册覆盖，并告警提示）；options.public=true 对外开放 */
export function registerCapability(name: string, handler: CapabilityHandler, options?: { public?: boolean }): void {
  if (capabilities.has(name)) {
    console.warn(`[capabilities] 能力 ${name} 重复注册，将覆盖旧实现`);
  }
  capabilities.set(name, handler);
  capabilityMeta.set(name, { public: !!options?.public });
}

/** 调用能力；未注册返回 null（调用方降级），handler 抛错向上传播 */
export async function callCapability(name: string, args?: any, ctx?: any): Promise<any> {
  const handler = capabilities.get(name);
  if (!handler) {
    console.warn(`[capabilities] 能力 ${name} 未注册`);
    return null;
  }
  return handler(args, ctx);
}

/** 同步版调用（能力为同步函数时） */
export function callCapabilitySync(name: string, args?: any, ctx?: any): any {
  const handler = capabilities.get(name);
  if (!handler) return null;
  return handler(args, ctx);
}

/** 判断能力是否已注册且对外开放（API 网关可调用） */
export function isPublicCapability(name: string): boolean {
  return capabilities.has(name) && !!capabilityMeta.get(name)?.public;
}

/** 列出已注册能力 */
export function listCapabilities(): { name: string; public: boolean; registered: boolean }[] {
  return Array.from(capabilities.keys()).map((name) => ({
    name,
    public: !!capabilityMeta.get(name)?.public,
    registered: true,
  }));
}
