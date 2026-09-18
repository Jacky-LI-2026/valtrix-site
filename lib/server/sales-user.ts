/**
 * 后台用户（销售）视角 helper：会话用户是否为管理员/销售、绑定哪些商城产品
 * 用于订单列表过滤与操作权限校验（销售仅可接待自己绑定产品的订单）。
 */
import { prisma } from "@/lib/prisma";

export interface SalesViewer {
  userId: bigint | null;
  isAdmin: boolean;
  isSales: boolean;
  salesProductIds: bigint[];
  displayName: string;
}

export async function getSalesViewer(sessionUser: { id?: string | number | null } | null | undefined): Promise<SalesViewer> {
  const empty: SalesViewer = { userId: null, isAdmin: false, isSales: false, salesProductIds: [], displayName: "" };
  if (!sessionUser?.id) return empty;
  try {
    const uid = BigInt(String(sessionUser.id));
    const u = await prisma.user.findUnique({
      where: { id: uid },
      include: {
        userRoles: { include: { role: true } },
        salesProducts: { select: { id: true } },
      },
    });
    if (!u) return empty;
    return {
      userId: u.id,
      isAdmin: u.userRoles.some((r: any) => r.role?.name === "admin"),
      isSales: u.isSales && u.status === "active",
      salesProductIds: u.salesProducts.map((p: any) => p.id),
      displayName: u.displayName || u.username,
    };
  } catch {
    return empty;
  }
}

/** 从订单 items 提取商品 id（number[]） */
export function orderProductIds(items: unknown): bigint[] {
  const arr = Array.isArray(items) ? items : [];
  const ids: bigint[] = [];
  for (const it of arr as any[]) {
    const pid = it?.productId ?? it?.id;
    if (pid !== undefined && pid !== null) {
      try {
        ids.push(BigInt(pid));
      } catch { /* 忽略非法 id */ }
    }
  }
  return ids;
}
