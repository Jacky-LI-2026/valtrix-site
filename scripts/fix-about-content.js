/**
 * 修复 about profile/honors 的空壳 contentJa/Ko/Ar（heading/paragraphs 全空的情况）
 * 用 content（中文块）重新翻译生成有效内容
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = { Ja: { langPair: 'ja-JP' }, Ko: { langPair: 'ko-KR' }, Ar: { langPair: 'ar-SA' } };
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

async function translateSmart(text, langPair) {
  if (!text || !String(text).trim()) return null;
  for (let a = 0; a < 3; a++) {
    const t = await translateMyMemory(String(text), langPair);
    if (t) return t;
    await sleep(1800);
  }
  return null;
}

// 判断 contentX 是否空壳
function isEmptyShell(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.every((b) => (!b.heading || !String(b.heading).trim()) && (!b.paragraphs || b.paragraphs.length === 0 || b.paragraphs.every((p) => !p)));
}

async function main() {
  const abouts = await prisma.aboutSection.findMany();
  for (const a of abouts) {
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      const cur = a[`content${suffix}`];
      if (!isEmptyShell(cur)) continue;
      if (!Array.isArray(a.content) || a.content.length === 0) continue;
      const out = [];
      for (const block of a.content) {
        const nb = { blockId: block.blockId || '', heading: '', paragraphs: [] };
        if (typeof block.heading === 'string' && block.heading.trim()) {
          nb.heading = (await translateSmart(block.heading, cfg.langPair)) || block.heading;
          await sleep(600);
        }
        if (Array.isArray(block.paragraphs)) {
          for (const p of block.paragraphs) {
            const t = await translateSmart(p, cfg.langPair);
            nb.paragraphs.push(t || p);
            await sleep(600);
          }
        }
        out.push(nb);
      }
      update[`content${suffix}`] = out;
      console.log(`  ${a.slug} content${suffix} 重新翻译（${out.length} 块）`);
    }
    if (Object.keys(update).length) {
      await prisma.aboutSection.update({ where: { id: a.id }, data: update });
      console.log(`✔ ${a.slug} 已保存`);
    }
  }
  console.log('完成');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
