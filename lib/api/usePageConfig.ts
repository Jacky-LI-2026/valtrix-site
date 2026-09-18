"use client";

import { useState, useEffect } from "react";

/**
 * 页面配置Hook
 * 用于获取页面配置信息，包括页面标题、副标题、面包屑等
 * @param page 页面标识，如 "about"、"products" 等
 * @returns 页面配置对象和加载状态
 */
export function usePageConfig(page: string) {
  const [pageConfig, setPageConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/page-config?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setPageConfig(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return { pageConfig, loading };
}

/**
 * 获取页面配置中的指定字段，如果不存在则使用默认值
 * @param pageConfig 页面配置对象
 * @param field 字段名
 * @param defaultValue 默认值
 * @returns 字段值或默认值
 */
export function getConfigValue(pageConfig: any, field: string, defaultValue: string): string {
  return pageConfig?.[field] || defaultValue;
}
