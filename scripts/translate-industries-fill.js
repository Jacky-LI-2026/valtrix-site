/**
 * 行业标量字段补漏脚本（optics / new-energy 的 name/tagline/description）
 * 仅翻译缺失的标量字段，数组字段已完整则跳过
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = {
  Ja: { langPair: 'ja-JP' },
  Ko: { langPair: 'ko-KR' },
  Ar: { langPair: 'ar-SA' },
};
const FIELDS = ['name', 'tagline', 'description'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateMyMemory(text, langPair) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${langPair}&de=dev%40zuowentech.com`;
    const res = await fetch(url);
    if (res.status === 429) return null;
    if (!res.ok) return null;
    const data = await res.json();
    let t = data?.responseData?.translatedText || '';
    if (t) t = t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
    return t || null;
  } catch (e) { return null; }
}

function isHtml(t) { return /<\/?[a-z][\s\S]*>/i.test(t); }
function extractPlain(html) {
  if (!html) return '';
  const wb = html.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  return wb.replace(/<[^>]*>/g, '').replace(/\n+/g, '\n').trim();
}

async function translateSmart(text, langPair) {
  if (!text || !String(text).trim()) return null;
  const html = isHtml(text);
  const src = html ? extractPlain(text) : String(text);
  for (let a = 0; a < 4; a++) {
    const t = await translateMyMemory(src, langPair);
    if (t) {
      if (html) return t.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('');
      return t;
    }
    await sleep(2000);
  }
  return null;
}

async function main() {
  const slugs = ['optics', 'new-energy'];
  for (const slug of slugs) {
    const ind = await prisma.industry.findUnique({ where: { slug } });
    if (!ind) { console.log(`未找到 ${slug}`); continue; }
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      for (const f of FIELDS) {
        const cur = ind[`${f}${suffix}`];
        const empty = cur === null || cur === undefined || (typeof cur === 'string' && !cur.trim());
        if (!empty) continue;
        const t = await translateSmart(ind[f], cfg.langPair);
        if (t) { update[`${f}${suffix}`] = t; console.log(`  ${slug}.${f}${suffix} 已翻译`); }
        else console.log(`  ${slug}.${f}${suffix} 翻译失败`);
        await sleep(900);
      }
    }
    if (Object.keys(update).length) {
      await prisma.industry.update({ where: { id: ind.id }, data: update });
      console.log(`✔ ${slug} 已保存: ${Object.keys(update).join(', ')}`);
    }
  }
  console.log('补漏完成');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
