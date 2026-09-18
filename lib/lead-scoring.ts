/**
 * 线索评分引擎：基于访客行为事件与页面浏览，对访客/商机计算意向分与等级。
 * 纯查询时聚合，不落库、不改 schema，全站复用。
 */

export interface ScoreResult {
  score: number; // 0-100
  level: "high" | "medium" | "low";
  levelText: string;
  breakdown: {
    pageViews: number;
    detailViews: number;
    interactions: number;
    durationSeconds: number;
  };
}

export interface VisitorAgg {
  visitorKey: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  lastSeenAt: Date | null;
  totalDuration: number | null;
  pageViews: number;
  detailViews: number;
  interactions: number;
  durationSeconds: number;
}

const LEVEL_TEXT: Record<string, string> = {
  high: "高意向",
  medium: "中意向",
  low: "低意向",
};

/** 详情页正则：产品/行业/新闻/服务/关于 的二级页 */
const DETAIL_PATH = /^\/(products\/|industries\/|news\/|services\/|about\/|resources\/)/i;

/** 高价值交互事件（下载/询价/留言/联系） */
const HIGH_VALUE_EVENTS = ["download", "quote", "contact", "inquiry", "request_quote", "manual_download"];

/** 计算单访客评分 */
export function scoreVisitor(a: VisitorAgg): ScoreResult {
  let score = 0;
  const b = {
    pageViews: a.pageViews,
    detailViews: a.detailViews,
    interactions: a.interactions,
    durationSeconds: a.durationSeconds,
  };

  score += Math.min(10, b.pageViews); // 浏览深度
  score += Math.min(15, b.detailViews * 3); // 详情页（强兴趣）
  score += Math.min(20, b.interactions * 5); // 下载/询价/留言（高价值）
  score += Math.min(15, Math.floor(b.durationSeconds / 60)); // 停留时长（分钟）

  score = Math.min(100, Math.max(0, score));
  const level = score >= 40 ? "high" : score >= 20 ? "medium" : "low";
  return { score, level, levelText: LEVEL_TEXT[level], breakdown: b };
}

/** 检查路径是否详情页 */
export function isDetailPath(path: string): boolean {
  return DETAIL_PATH.test(path);
}

/** 判断事件是否为高价值交互 */
export function isHighValueEvent(type: string, action?: string | null, label?: string | null): boolean {
  const t = String(type || "").toLowerCase();
  const act = String(action || "").toLowerCase();
  const lab = String(label || "").toLowerCase();
  if (HIGH_VALUE_EVENTS.some((k) => t.includes(k) || act.includes(k) || lab.includes(k))) return true;
  if (lab.includes("下载") || lab.includes("询价") || lab.includes("报价")) return true;
  return false;
}

/** 获取访客的关键高价值行为描述（用于线索列表展示） */
export function keyBehaviors(a: VisitorAgg): string[] {
  const out: string[] = [];
  if (a.detailViews > 0) out.push(`浏览 ${a.detailViews} 个详情页`);
  if (a.interactions > 0) out.push(`高价值交互 ${a.interactions} 次`);
  if (a.durationSeconds >= 60) out.push(`停留 ${Math.floor(a.durationSeconds / 60)} 分钟`);
  return out;
}

/** 返回整型秒 */
export function toSeconds(ms: number): number {
  return Math.round(ms / 1000);
}
