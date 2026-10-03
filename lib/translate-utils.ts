// 通用JSON内容翻译工具
// 支持字符串数组和对象数组的翻译，支持嵌套结构

// 翻译队列和延迟机制，避免同时发起大量的翻译请求
// 百度免费版 QPS 上限约 1 次/秒（超限报 54003），这里用 1100ms 全局节流（含字符串/数组/自动翻译所有请求）
let lastTranslateTime = 0;
export const TRANSLATE_DELAY = 1100;

/** 全局节流：所有翻译请求共享同一时间戳，跨字段/跨组件生效，避免突发超限 */
export async function throttleTranslate(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastTranslateTime;
  if (elapsed < TRANSLATE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, TRANSLATE_DELAY - elapsed));
  }
  lastTranslateTime = Date.now();
}

async function translateWithDelay(text: string, targetLang: string): Promise<string> {
  await throttleTranslate();
  return translateSingleText(text, targetLang);
}

export async function translateJsonArray(
  jsonStr: string,
  targetLang: string = 'en'
): Promise<string> {
  if (!jsonStr) return '[]';

  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data) || data.length === 0) return jsonStr;

    // 检查是否是内容块格式（包含lang字段的对象数组）
    const hasLangField = data.some(item => typeof item === 'object' && item !== null && 'lang' in item);
    
    if (hasLangField) {
      // 内容块格式：只翻译中文内容块（lang为"zh"），并返回目标语言内容块
      const zhBlocks = data.filter(item => item.lang === 'zh');
      
      if (zhBlocks.length === 0) {
        // 如果没有中文内容块，返回空数组
        return '[]';
      }

      // 递归翻译函数：处理任意嵌套的数组和对象
      // 不翻译的标识符字段列表
      const skipFields = ['blockId', 'id', 'key', 'type', 'icon', 'image', 'images', 'url', 'link', 'href', 'src', 'video', 'file', 'files', 'slug', 'code'];
      const translateValue = async (value: any, currentKey?: string): Promise<any> => {
        // 如果当前字段是标识符字段，不翻译，直接返回原值
        if (currentKey && skipFields.includes(currentKey)) {
          return value;
        }
        if (typeof value === 'string' && value.trim()) {
          return await translateWithDelay(value, targetLang);
        } else if (Array.isArray(value)) {
          const result: any[] = [];
          for (const item of value) {
            result.push(await translateValue(item, currentKey));
          }
          return result;
        } else if (typeof value === 'object' && value !== null) {
          const result: Record<string, any> = {};
          for (const key of Object.keys(value)) {
            if (key === 'lang') {
              // lang字段设置为目标语言，不翻译
              result[key] = targetLang;
            } else {
              result[key] = await translateValue(value[key], key);
            }
          }
          return result;
        }
        return value;
      };

      const translatedBlocks = [];
      for (const block of zhBlocks) {
        const translatedBlock = await translateValue(block);
        translatedBlocks.push(translatedBlock);
      }
      
      return JSON.stringify(translatedBlocks, null, 2);
    }

    // 普通JSON数组格式：递归翻译所有字符串
    // 不翻译的标识符字段列表
    const skipFields = ['blockId', 'id', 'key', 'type', 'icon', 'image', 'images', 'url', 'link', 'href', 'src', 'video', 'file', 'files', 'slug', 'code'];
    const translateValue = async (value: any, currentKey?: string): Promise<any> => {
      // 如果当前字段是标识符字段，不翻译，直接返回原值
      if (currentKey && skipFields.includes(currentKey)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        return await translateWithDelay(value, targetLang);
      } else if (Array.isArray(value)) {
        const result: any[] = [];
        for (const item of value) {
          result.push(await translateValue(item, currentKey));
        }
        return result;
      } else if (typeof value === 'object' && value !== null) {
        const result: Record<string, any> = {};
        for (const key of Object.keys(value)) {
          result[key] = await translateValue(value[key], key);
        }
        return result;
      }
      return value;
    };

    const result = await translateValue(data);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    console.error('翻译JSON数组失败:', e);
    return jsonStr;
  }
}

export async function translateSingleText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;

  // 限流/失败自动重试一次（百度 54003 是瞬时频控，退避后重试通常成功）
  const base =
    typeof window === "undefined"
      ? (process.env.NEXTAUTH_URL || "http://127.0.0.1:3000").replace(/\/+$/, "")
      : "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${base}/api/admin/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 仅真正翻译成功才采用；provider=fallback 表示限流/失败返回原文
        if (data.provider !== 'fallback' && data.translatedText && data.translatedText.trim()) {
          return data.translatedText;
        }
      } else {
        // 🔴 2026-09-18：非 2xx 此前被静默忽略（本函数契约是"失败返回原文"，
        //    但**至少要留下原因**，否则后台表现为"翻译没反应"却查不到线索）。
        //    典型：401/403（权限在登录时写进 JWT，权限刚变更的存量会话会 403）。
        let msg = '';
        try { msg = (await res.json())?.error || ''; } catch { /* 非 JSON */ }
        console.error(`翻译接口非 2xx：${res.status} ${msg}`);
      }
    } catch (e) {
      console.error('调用翻译API失败:', e);
    }

    if (attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }

  // 翻译失败时返回原文，而不是空字符串
  return text;
}
