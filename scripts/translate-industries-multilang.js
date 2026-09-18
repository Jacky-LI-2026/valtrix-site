/**
 * 行业方案多语言补全脚本
 * - 读取全部 published 行业
 * - 对缺少 Ja/Ko/Ar 的字段进行翻译（MyMemory 免费接口，zh-CN → ja-JP / ko-KR / ar-SA）
 * - 串行节流避免 429；HTML 富文本（description）先剥离标签翻译再恢复
 * - 用 Prisma 直写数据库
 *
 * 用法: node scripts/translate-industries-multilang.js [slug]
 *   不带参数翻译全部；带 slug 只翻译指定行业（验证用）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = {
  Ja: { langPair: 'ja-JP', label: '日文' },
  Ko: { langPair: 'ko-KR', label: '韩文' },
  Ar: { langPair: 'ar-SA', label: '阿拉伯文' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 提取 HTML 中的纯文本（保留段落结构）
function extractPlain(html) {
  if (!html) return '';
  // 保留 <p> 段落边界，翻译时按段落处理
  const withBreaks = html.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  return withBreaks.replace(/<[^>]*>/g, '').replace(/\n+/g, '\n').trim();
}

function isHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

async function translateMyMemory(text, langPair) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${langPair}&de=dev%40zuowentech.com`;
    const res = await fetch(url);
    if (res.status === 429) return null; // 限流，由调用方重试
    if (!res.ok) return null;
    const data = await res.json();
    let t = data?.responseData?.translatedText || '';
    if (t) {
      t = t
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .trim();
    }
    return t || null;
  } catch (e) {
    return null;
  }
}

// 翻译一段文本（含 HTML 处理 + 限流重试）
async function translateSmart(text, langPair) {
  const isHtmlText = isHtml(text);
  const source = isHtmlText ? extractPlain(text) : text;
  if (!source) return text;

  for (let attempt = 0; attempt < 3; attempt++) {
    const t = await translateMyMemory(source, langPair);
    if (t) {
      if (isHtmlText) {
        // 按行恢复 <p> 段落
        const paras = t.split('\n').filter((x) => x.trim());
        return paras.map((p) => `<p>${p}</p>`).join('');
      }
      return t;
    }
    await sleep(1500); // 429 或失败后等待重试
  }
  return null; // 全部失败，调用方决定是否回退原文
}

// 翻译 JSON 数组字段
async function translateArrayField(arr, langPair) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const t = await translateSmart(item, langPair);
      out.push(t || item);
      await sleep(700);
    } else if (item && typeof item === 'object') {
      const obj = { ...item };
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          const t = await translateSmart(obj[k], langPair);
          if (t) obj[k] = t;
          await sleep(700);
        }
      }
      out.push(obj);
    } else {
      out.push(item);
    }
  }
  return out;
}

async function main() {
  const targetSlug = process.argv[2] || null;
  const industries = await prisma.industry.findMany({
    where: { status: 'published', ...(targetSlug ? { slug: targetSlug } : {}) },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`待处理行业: ${industries.length} 个`);
  if (industries.length === 0) {
    console.log('没有需要处理的行业');
    return;
  }

  let total = 0;
  for (const ind of industries) {
    console.log(`\n===== ${ind.slug} (${ind.name}) =====`);
    const update = {};

    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      const field = `name${suffix}`;
      const hasName = ind[field] && String(ind[field]).trim();
      if (hasName) {
        console.log(`  ${cfg.label} 已有 name，跳过该语种`);
        continue;
      }

      // name
      const nameT = await translateSmart(ind.name, cfg.langPair);
      if (nameT) update[field] = nameT;
      await sleep(700);

      // tagline
      const taglineT = await translateSmart(ind.tagline, cfg.langPair);
      if (taglineT) update[`tagline${suffix}`] = taglineT;
      await sleep(700);

      // description (HTML)
      const descT = await translateSmart(ind.description, cfg.langPair);
      if (descT) update[`description${suffix}`] = descT;
      await sleep(700);

      // challenges (string[])
      update[`challenges${suffix}`] = await translateArrayField(ind.challenges, cfg.langPair);

      // products (string[])
      update[`products${suffix}`] = await translateArrayField(ind.products, cfg.langPair);

      // solutions (obj[] title/desc)
      update[`solutions${suffix}`] = await translateArrayField(ind.solutions, cfg.langPair);

      // cases (obj[] title/desc)
      update[`cases${suffix}`] = await translateArrayField(ind.cases, cfg.langPair);

      total++;
      console.log(`  ${cfg.label} 翻译完成: ${Object.keys(update).filter((k) => k.endsWith(suffix)).length} 个字段`);
    }

    if (Object.keys(update).length > 0) {
      await prisma.industry.update({
        where: { id: ind.id },
        data: update,
      });
      console.log(`  ✔ 已保存 ${ind.slug}，字段: ${Object.keys(update).join(', ')}`);
    }
  }
  console.log(`\n全部完成，共处理 ${total} 个语种-行业组合`);
}

main()
  .catch((e) => {
    console.error('脚本失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
