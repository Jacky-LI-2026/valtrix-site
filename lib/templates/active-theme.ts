"use client";

import { useState, useEffect } from "react";

/**
 * 前台活动模板检测（客户端）
 * 读取 <html data-template="xxx"> 属性，返回当前活动模板 slug。
 * 由 app/layout.tsx 的 getTheme() + getTemplatePreset() 注入。
 *
 * 用法：
 *   const { template, isUnilok } = useActiveTemplate();
 *   if (isUnilok) return <UnilokHeader />;
 *   return <Header />;
 *
 * KITZ 洁净科技风（kitz-clean）为 2026-09 新增主题，判定字段 isKitz；
 * isUnilok / isDefault 语义保持不变（后向兼容）。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D3/D4）。
 */

export const UNILOK_SLUG = "unilok-industrial";

/** KITZ 洁净科技风模板 slug（与 lib/templates/get-active-template.ts 的 KITZ_CLEAN_SLUG 保持一致） */
export const KITZ_CLEAN_SLUG = "kitz-clean";

export function useActiveTemplate() {
  const [template, setTemplate] = useState<string>("");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const slug = document.documentElement.dataset.template || "";
    setTemplate(slug);
  }, []);

  return {
    template,
    isUnilok: template === UNILOK_SLUG,
    isKitz: template === KITZ_CLEAN_SLUG,
    isDefault: template !== UNILOK_SLUG,
  };
}

/** 服务端/构建期不可用，仅客户端 mount 后读取 */
export function getActiveTemplateSlugClient(): string {
  if (typeof document === "undefined") return "";
  return document.documentElement.dataset.template || "";
}
