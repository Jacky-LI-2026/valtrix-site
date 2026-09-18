/**
 * 翻译原子（Translate Atom）
 * =====================================================
 * 统一翻译入口：单条 / 批量 / JSON 结构，全局节流。
 * 封装 lib/translate-utils.ts，页面/API 统一调用本层。
 */
export {
  translateSingleText,
  translateJsonArray,
  throttleTranslate,
  TRANSLATE_DELAY,
} from "@/lib/translate-utils";
import { translateSingleText, translateJsonArray, throttleTranslate } from "@/lib/translate-utils";

export interface TranslateBatchItem {
  text: string;
  targetLang: string;
}

/**
 * 批量翻译（顺序执行，共享全局节流）。
 * @returns 与原数组等长的翻译结果（空/失败项返回原文本）。
 */
export async function translateBatch(items: TranslateBatchItem[]): Promise<string[]> {
  const results: string[] = [];
  for (const item of items) {
    try {
      const t = item.text.trim();
      if (!t) { results.push(item.text); continue; }
      results.push(await translateSingleText(t, item.targetLang));
    } catch {
      results.push(item.text);
    }
  }
  return results;
}

/**
 * 翻译 JSON 数组（字符串数组 / 内容块对象数组）。
 */
export async function translateJson(jsonStr: string, targetLang: string): Promise<string> {
  return translateJsonArray(jsonStr, targetLang);
}

/** 判断字符串是否为 JSON 数组/对象（用于表单字段识别） */
export function looksLikeJson(value: string): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const t = value.trim();
  return (t.startsWith("[") || t.startsWith("{")) && (() => { try { JSON.parse(t); return true; } catch { return false; } })();
}
