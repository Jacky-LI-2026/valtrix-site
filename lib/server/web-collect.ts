// 全网知识收集：搜索引擎结果抓取（服务端）
// 目标：给定关键词，从公开搜索结果收集标题/摘要/来源链接，作为 AI 知识库生成的素材
// 搜索引擎选择：cn.bing.com（国内可达、HTML 结构稳定）；失败降级百度

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 从 query 提取 ≥2 字的词元（用于相关性过滤） */
function extractTerms(query: string): string[] {
  return (query || "")
    .replace(/[，。、；：""''（）()？?！!·\-\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** 素材是否与 query 相关：标题或摘要命中至少一个词元 */
function isRelevant(source: WebSource, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = (source.title + " " + source.snippet).toLowerCase();
  return terms.some((t) => hay.includes(t.toLowerCase()));
}

/** 抓取必应搜索结果（cn.bing.com） */
export async function fetchBingResults(query: string, count = 6): Promise<WebSource[]> {
  const terms = extractTerms(query);
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.max(count + 3, 10)}&setlang=zh-CN`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Bing HTTP " + res.status);
  const html = await res.text();
  const results: WebSource[] = [];
  // 解析 <li class="b_algo"> 块
  const blockRe = /<li class="b_algo"[\s\S]*?<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null && results.length < count) {
    const block = m[0];
    const href = block.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/i);
    const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]) : "";
    const url = href ? href[1] : "";
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : "";
    if (!url || !title) continue;
    // 跳过必应自家/广告链接
    if (/bing\.com|microsoft\.com\/.*(?:privacy|terms)|go\.microsoft/i.test(url)) continue;
    const src = { title: title.slice(0, 200), url: url.slice(0, 500), snippet: snippet.slice(0, 400) };
    if (!isRelevant(src, terms)) continue;
    results.push(src);
  }
  return results;
}

/** 抓取百度搜索结果（cn.bing 失败时降级） */
export async function fetchBaiduResults(query: string, count = 6): Promise<WebSource[]> {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=${count}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Baidu HTTP " + res.status);
  const html = await res.text();
  const results: WebSource[] = [];
  const blockRe = /<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null && results.length < count) {
    const block = m[0];
    const href = block.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/i);
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const text = stripHtml(block).replace(/\s+/g, " ").trim();
    const title = titleMatch ? stripHtml(titleMatch[1]) : text.slice(0, 80);
    const url = href ? href[1] : "";
    if (!url || !title) continue;
    const snippet = text.replace(title, "").slice(0, 300);
    results.push({ title: title.slice(0, 200), url: url.slice(0, 500), snippet });
  }
  return results;
}

/** 全网收集入口：必应优先，失败降级百度；都失败返回空数组 */
export async function collectWebSources(query: string, count = 6): Promise<{ sources: WebSource[]; engine: string }> {
  const errors: string[] = [];
  try {
    const r = await fetchBingResults(query, count);
    if (r.length > 0) return { sources: r, engine: "bing" };
    errors.push("bing 无结果");
  } catch (e: any) {
    errors.push("bing: " + (e?.message || ""));
  }
  try {
    const r = await fetchBaiduResults(query, count);
    if (r.length > 0) return { sources: r, engine: "baidu" };
    errors.push("baidu 无结果");
  } catch (e: any) {
    errors.push("baidu: " + (e?.message || ""));
  }
  throw new Error(errors.join("；") || "全网收集失败");
}
