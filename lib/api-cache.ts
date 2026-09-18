import { NextResponse } from "next/server";

/**
 * 公开 API 缓存配置
 *
 * 前台为客户端渲染（CSR），所有数据通过 /api/public/* 实时查询数据库。
 * 为降低数据库压力、减少服务器负载，这里为不同数据按"变化频率"设置缓存策略：
 *
 *  - static-long:   极少变化（语种/菜单），CDN+浏览器 1 小时强缓存
 *  - config:        后台可改配置（首页/站点/页面/SEO），CDN 5 分钟 + SWR 1 小时
 *  - content:       内容型数据（产品/行业/服务/关于/资源/职位），CDN 5 分钟 + SWR 1 小时
 *  - dynamic:       变化较快（新闻，含自动采集），CDN 60 秒 + SWR 5 分钟
 *
 * 后台保存数据后，由于 revalidate 使用 stale-while-revalidate，
 * 前台最多延迟 5 分钟（content/config）看到最新数据，不会出现缓存永久失效。
 */

export type CacheStrategy = "static-long" | "config" | "content" | "dynamic";

const CACHE_TTL: Record<CacheStrategy, { sMaxAge: number; stale: number }> = {
  "static-long": { sMaxAge: 3600, stale: 3600 },
  config: { sMaxAge: 300, stale: 3600 },
  content: { sMaxAge: 300, stale: 3600 },
  dynamic: { sMaxAge: 60, stale: 300 },
};

/**
 * 生成带缓存头的 JSON 响应
 * @param data 响应体（直接传入，不要再用 NextResponse.json 包一层）
 * @param strategy 缓存策略
 */
export function cachedJson(data: unknown, strategy: CacheStrategy = "content", status = 200) {
  const { sMaxAge, stale } = CACHE_TTL[strategy];
  // s-maxage 作用于 CDN/共享缓存；stale-while-revalidate 允许后台更新后异步刷新
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}`,
    },
  });
}

/**
 * 便捷包装：确保 status 参数也被正确传递（供部分需要非 200 的接口使用）
 */
export function cachedError(message: string, status = 500) {
  return new NextResponse(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
