// 多语言内容获取辅助函数
// 根据当前locale自动选择对应的语言字段，如果不存在则回退到中文

import type { Locale } from "@/config/i18n";

// 语言代码到字段后缀的映射
const localeFieldSuffix: Record<Locale, string> = {
  zh: "",
  en: "En",
  ja: "Ja",
  ko: "Ko",
  fr: "Fr",
  ar: "Ar",
};

/**
 * 根据当前locale获取对象中的多语言字段值
 * @param obj 包含多语言字段的对象
 * @param baseField 基础字段名（如 'name', 'description', 'title'）
 * @param locale 当前语言
 * @returns 对应语言的字段值，如果不存在则回退到中文
 */
export function getLocalizedField(
  obj: any,
  baseField: string,
  locale: Locale
): string {
  if (!obj) return "";

  const suffix = localeFieldSuffix[locale] || "";
  const fieldName = suffix ? `${baseField}${suffix}` : baseField;

  // 优先使用当前语言的字段
  const value = obj[fieldName];
  if (value !== undefined && value !== null && value !== "") {
    return typeof value === "string" ? value : String(value);
  }

  // 回退到中文字段
  const zhValue = obj[baseField];
  if (zhValue !== undefined && zhValue !== null) {
    return typeof zhValue === "string" ? zhValue : String(zhValue);
  }

  return "";
}

/**
 * 根据当前locale获取对象中的多语言数组字段值
 * @param obj 包含多语言字段的对象
 * @param baseField 基础字段名（如 'features', 'tags'）
 * @param locale 当前语言
 * @returns 对应语言的数组字段值，如果不存在则回退到中文
 */
export function getLocalizedArrayField(
  obj: any,
  baseField: string,
  locale: Locale
): any[] {
  if (!obj) return [];

  const suffix = localeFieldSuffix[locale] || "";
  const fieldName = suffix ? `${baseField}${suffix}` : baseField;

  // 优先使用当前语言的字段
  const value = obj[fieldName];
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  // 回退到中文字段
  const zhValue = obj[baseField];
  if (Array.isArray(zhValue)) {
    return zhValue;
  }

  return [];
}

/**
 * 根据当前locale获取对象中的文本字段值（兼容字符串或字符串数组）
 * @param obj 包含多语言字段的对象
 * @param baseField 基础字段名
 * @param locale 当前语言
 * @returns 对应语言的文本（数组自动 join 空格），不存在时回退中文
 */
export function getLocalizedText(
  obj: any,
  baseField: string,
  locale: Locale
): string {
  if (!obj) return "";

  const suffix = localeFieldSuffix[locale] || "";
  const fieldName = suffix ? `${baseField}${suffix}` : baseField;

  let value = obj[fieldName];
  if (value === undefined || value === null || value === "") {
    value = obj[baseField];
  }
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.join(" ") : String(value);
}

/**
 * 创建一个绑定了特定locale的多语言获取函数
 * @param locale 当前语言
 * @returns 绑定了locale的getLocalizedField函数
 */
export function createLocalizedGetter(locale: Locale) {
  return {
    get: (obj: any, baseField: string) =>
      getLocalizedField(obj, baseField, locale),
    getArray: (obj: any, baseField: string) =>
      getLocalizedArrayField(obj, baseField, locale),
    getText: (obj: any, baseField: string) =>
      getLocalizedText(obj, baseField, locale),
  };
}
