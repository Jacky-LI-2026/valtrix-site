"use client";

import { useEffect } from "react";

/**
 * 客户端页面标题设置器（SEO）
 * App Router 中 "use client" 页面无法导出 metadata，用本组件在挂载时设置 document.title。
 * 用法：<PageTitle title={t("cartTitle")} fallback="询价车" />
 */
export default function PageTitle({ title, fallback }: { title?: string; fallback?: string }) {
  useEffect(() => {
    const final = title || fallback || "";
    if (final && document.title !== final) {
      document.title = final;
    }
  }, [title, fallback]);
  return null;
}
