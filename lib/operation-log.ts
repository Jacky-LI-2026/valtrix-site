import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export interface OperationLogInput {
  module: string;
  action: string;
  target?: string;
  detail?: string;
}

/**
 * 统一操作日志入口（后台管理操作）
 * 所有 admin 写操作（增删改/启停）都应调用本函数记录，避免各 API 各自写 prisma.operationLog.create。
 */
export async function recordOperation({ module, action, target, detail }: OperationLogInput) {
  try {
    let username = "admin";
    try {
      const session = await auth();
      username = session?.user?.name || session?.user?.email || "admin";
    } catch {
      // 拿不到会话时按 admin 记录
    }
    await prisma.operationLog.create({
      data: {
        username,
        module,
        action,
        target: target || "",
        detail: detail || "",
      },
    });
  } catch (e) {
    // 日志失败不影响主流程
    console.error("[operation-log] 记录失败", e);
  }
}

/** 从常见请求体字段中提取展示名 */
export function pickTarget(body: Record<string, any>): string {
  if (!body || typeof body !== "object") return "";
  return (
    body.name ||
    body.title ||
    body.question ||
    body.slug ||
    body.model ||
    body.id ||
    ""
  );
}
