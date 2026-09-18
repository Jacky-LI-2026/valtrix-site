/**
 * 前台提交类接口通用防刷：按 IP + 动作 的滑动窗口限流（内存实现）
 * 生产建议 Redis，这里用 Map 带定期清理，够用作基本防护
 */
const store = new Map<string, number[]>(); // key: `${action}:${ip}` -> 时间戳数组

// 定期清理（每 5 分钟清一次过期数据）
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of Array.from(store.entries())) {
    const kept = arr.filter((t) => now - t < 10 * 60 * 1000);
    if (kept.length === 0) store.delete(key);
    else store.set(key, kept);
  }
}, 5 * 60 * 1000).unref?.();

/** 从请求中解析客户端真实 IP（Nginx/pm2 反代场景取 x-forwarded-for 首个） */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  if (first && first !== "unknown") return first;
  return req.headers.get("x-real-ip") || "unknown";
}

/** 校验是否触发限流。返回 {ok:是否放行, retryAfter:还需等待秒数} */
export function checkRateLimit(action: string, ip: string, limit = 5, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  if (!ip || ip === "unknown") return { ok: true, retryAfter: 0 }; // 拿不到 IP 不拦（避免误伤）
  const key = `${action}:${ip}`;
  const now = Date.now();
  const arr = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const oldest = arr[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  store.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

/** 便捷封装：返回 429 响应 */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: `操作过于频繁，请 ${retryAfter} 秒后再试` }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
  });
}
