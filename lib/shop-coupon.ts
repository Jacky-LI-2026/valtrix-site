// 优惠券计算与校验工具（服务端权威计价）
import type { ShopCoupon } from "@/lib/generated/prisma";

export interface CouponLike {
  code: string;
  type: string;
  amount: any; // Decimal | number
  minAmount: any;
  maxDiscount: any;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
}

const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const s = typeof v.toString === "function" ? v.toString() : String(v);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** 券是否处于有效期 */
export function couponInEffect(c: CouponLike, now = new Date()): boolean {
  if (!c.isActive) return false;
  if (c.startAt && new Date(c.startAt).getTime() > now.getTime()) return false;
  if (c.endAt && new Date(c.endAt).getTime() < now.getTime()) return false;
  return true;
}

/** 计算优惠金额（实付 = goodsTotal - discount；不满门槛返回 0） */
export function calcCouponDiscount(c: CouponLike, goodsTotal: number): number {
  if (goodsTotal <= 0) return 0;
  const min = toNum(c.minAmount);
  if (goodsTotal < min) return 0;
  if (c.type === "percent") {
    const rate = toNum(c.amount) / 100; // 90 = 9 折
    let d = goodsTotal * (1 - Math.min(Math.max(rate, 0), 0.99));
    const cap = toNum(c.maxDiscount);
    if (cap > 0 && d > cap) d = cap;
    return Math.round(d * 100) / 100;
  }
  // fixed 满减
  const d = Math.min(toNum(c.amount), goodsTotal);
  return Math.round(d * 100) / 100;
}

/** 券面展示文案（discount 文案，由调用方拼名称） */
export function couponValueText(c: CouponLike): string {
  if (c.type === "percent") {
    const rate = toNum(c.amount);
    const cap = toNum(c.maxDiscount);
    return cap > 0 ? `${rate / 10} 折（最高减 ¥${cap}）` : `${rate / 10} 折`;
  }
  return `满 ¥${toNum(c.minAmount)} 减 ¥${toNum(c.amount)}`;
}

/** 序列化券（后台列表/前台展示共用） */
export function serializeCoupon(c: any): any {
  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    nameEn: c.nameEn,
    nameJa: c.nameJa,
    nameKo: c.nameKo,
    nameFr: c.nameFr,
    nameAr: c.nameAr,
    type: c.type,
    amount: toNum(c.amount),
    minAmount: toNum(c.minAmount),
    maxDiscount: toNum(c.maxDiscount),
    startAt: c.startAt,
    endAt: c.endAt,
    total: c.total,
    claimed: c.claimed,
    perUser: c.perUser,
    isActive: c.isActive,
    createdAt: c.createdAt,
  };
}

export { toNum as couponToNum };
