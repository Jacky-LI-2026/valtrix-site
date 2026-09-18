/**
 * 服务 / 资源条目 / 关于 多语言补全脚本
 * - services: title/subtitle/description + features/process 数组
 * - resourceItems: title/description
 * - about: title/subtitle + content 块数组 (heading/paragraphs)
 * 翻译源: MyMemory + de 配额参数
 * 用法: node scripts/translate-modules-multilang.js [service|resource|about|all]
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = {
  Ja: { langPair: 'ja-JP' },
  Ko: { langPair: 'ko-KR' },
  Ar: { langPair: 'ar-SA' },
};
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
  for (let a = 0; a < 3; a++) {
    const t = await translateMyMemory(src, langPair);
    if (t) {
      if (html) return t.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('');
      return t;
    }
    await sleep(1800);
  }
  return null;
}

// 翻译 JSON 数组字段（字符串数组 或 对象数组）
async function translateArray(arr, langPair) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const t = await translateSmart(item, langPair);
      out.push(t || item);
      await sleep(600);
    } else if (item && typeof item === 'object') {
      const obj = { ...item };
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          const t = await translateSmart(obj[k], langPair);
          if (t) obj[k] = t;
          await sleep(600);
        }
      }
      out.push(obj);
    } else out.push(item);
  }
  return out;
}

async function translateServices() {
  const svcs = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log(`服务: ${svcs.length} 个`);
  for (const s of svcs) {
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      if (s[`title${suffix}`] && String(s[`title${suffix}`]).trim()) continue;
      const titleT = await translateSmart(s.title, cfg.langPair);
      if (titleT) update[`title${suffix}`] = titleT;
      await sleep(600);
      const subT = await translateSmart(s.subtitle, cfg.langPair);
      if (subT) update[`subtitle${suffix}`] = subT;
      await sleep(600);
      const descT = await translateSmart(s.description, cfg.langPair);
      if (descT) update[`description${suffix}`] = descT;
      await sleep(600);
      update[`features${suffix}`] = await translateArray(s.features, cfg.langPair);
      update[`process${suffix}`] = await translateArray(s.process, cfg.langPair);
    }
    if (Object.keys(update).length) {
      await prisma.service.update({ where: { id: s.id }, data: update });
      console.log(`  ✔ ${s.slug}: ${Object.keys(update).length} 字段`);
    }
  }
}

async function translateResources() {
  const cats = await prisma.resourceCategory.findMany({ include: { items: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' } } } });
  console.log(`资源分类: ${cats.length} 个`);
  for (const c of cats) {
    for (const item of c.items) {
      const update = {};
      for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
        if (item[`title${suffix}`] && String(item[`title${suffix}`]).trim()) continue;
        const titleT = await translateSmart(item.title, cfg.langPair);
        if (titleT) update[`title${suffix}`] = titleT;
        await sleep(600);
        const descT = await translateSmart(item.description, cfg.langPair);
        if (descT) update[`description${suffix}`] = descT;
        await sleep(600);
      }
      if (Object.keys(update).length) {
        await prisma.resourceItem.update({ where: { id: item.id }, data: update });
        console.log(`  ✔ ${item.slug}: ${Object.keys(update).length} 字段`);
      }
    }
  }
}

async function translateAbout() {
  const abouts = await prisma.aboutSection.findMany();
  console.log(`关于: ${abouts.length} 个`);
  for (const a of abouts) {
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      if (a[`title${suffix}`] && String(a[`title${suffix}`]).trim()) continue;
      const titleT = await translateSmart(a.title, cfg.langPair);
      if (titleT) update[`title${suffix}`] = titleT;
      await sleep(600);
      const subT = await translateSmart(a.subtitle, cfg.langPair);
      if (subT) update[`subtitle${suffix}`] = subT;
      await sleep(600);
      // content 块数组
      if (Array.isArray(a.content) && a.content.length > 0) {
        const out = [];
        for (const block of a.content) {
          const nb = { ...block };
          if (typeof nb.heading === 'string' && nb.heading.trim()) {
            const t = await translateSmart(nb.heading, cfg.langPair);
            if (t) nb.heading = t;
            await sleep(600);
          }
          if (Array.isArray(nb.paragraphs)) {
            const ps = [];
            for (const p of nb.paragraphs) {
              const t = await translateSmart(p, cfg.langPair);
              ps.push(t || p);
              await sleep(600);
            }
            nb.paragraphs = ps;
          }
          out.push(nb);
        }
        update[`content${suffix}`] = out;
      }
    }
    if (Object.keys(update).length) {
      await prisma.aboutSection.update({ where: { id: a.id }, data: update });
      console.log(`  ✔ ${a.slug}: ${Object.keys(update).length} 字段`);
    }
  }
}

async function main() {
  const target = process.argv[2] || 'all';
  if (target === 'all' || target === 'service') await translateServices();
  if (target === 'all' || target === 'resource') await translateResources();
  if (target === 'all' || target === 'about') await translateAbout();
  console.log('全部完成');
}

main().catch((e) => { console.error('失败:', e); process.exit(1); }).finally(() => prisma.$disconnect());
