"use client";

/**
 * 前台/后台共用：探测"当前登录者能否发布到社媒"
 * --------------------------------------------------------------------------
 * 为什么要探针：前台详情页的「发布到社媒」只应对**有权限的后台用户**显示，
 *   普通访客不该看到后台入口。探针打 `/api/admin/social-publish/session`
 *   （该路径已被 middleware 收口），401/403 即隐藏。
 *
 * 模块级缓存 Promise：一个页面里多处使用只发一次请求；失败（未登录）也缓存，避免抖动重试。
 */
import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

function probe(): Promise<boolean> {
  if (!cached) {
    cached = fetch("/api/admin/social-publish/session", { cache: "no-store" })
      .then((r) => r.ok)
      .catch(() => false);
  }
  return cached;
}

export function useCanSocialPublish(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    let alive = true;
    probe().then((ok) => {
      if (alive) setCan(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  return can;
}

/** 后台列表行按钮用它拼跳转地址：内容类型 → 插件页的 type 参数 */
export const SOCIAL_TYPE_MAP: Record<string, "product" | "service" | "news"> = {
  products: "product",
  services: "service",
  news: "news",
};

export function socialPublishHref(typeName: string, id: string | number) {
  const t = SOCIAL_TYPE_MAP[typeName];
  if (!t) return null;
  return `/admin/social-publish?type=${t}&id=${encodeURIComponent(String(id))}`;
}
