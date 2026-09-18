/**
 * 产品（型号 + 规格）多语言补全脚本
 * - Product: name/subtitle/summary/description（HTML 处理）
 * - ProductSpec: label/value（value 含中文才翻）
 * 翻译源: MyMemory + de 配额参数
 * 用法: node scripts/translate-products-multilang.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = { Ja: { langPair: 'ja-JP' }, Ko: { langPair: 'ko-KR' }, Ar: { langPair: 'ar-SA' } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasCn = (t) => /[\u4e00-\u9fff]/.test(t || '');

async function translateMyMemory(text, langPair) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${langPair}&de=dev%40zuowentech.com`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
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
  const wb = html.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n');
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

async function main() {
  const products = await prisma.product.findMany({ where: { status: 'published' }, orderBy: { sortOrder: 'asc' }, include: { productSpecs: { orderBy: { sortOrder: 'asc' } } } });
  console.log(`产品: ${products.length} 个`);
  let calls = 0;
  for (const prod of products) {
    console.log(`\n===== ${prod.slug} (${prod.model}) =====`);
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      if (prod[`name${suffix}`] && String(prod[`name${suffix}`]).trim()) continue;
      // 标量
      for (const f of ['name', 'subtitle', 'summary', 'description']) {
        const t = await translateSmart(prod[f], cfg.langPair);
        if (t) update[`${f}${suffix}`] = t;
        calls++;
        await sleep(600);
      }
    }
    if (Object.keys(update).length) {
      await prisma.product.update({ where: { id: prod.id }, data: update });
      console.log(`  ✔ 产品字段: ${Object.keys(update).length}`);
    }
    // features 数组（对象 title/desc 或字符串）
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      if (prod[`features${suffix}`] && Array.isArray(prod[`features${suffix}`]) && prod[`features${suffix}`].length > 0) continue;
      if (!Array.isArray(prod.features) || prod.features.length === 0) continue;
      const out = [];
      for (const item of prod.features) {
        if (typeof item === 'string') {
          const t = await translateSmart(item, cfg.langPair);
          out.push(t || item);
          calls++;
          await sleep(600);
        } else if (item && typeof item === 'object') {
          const obj = { ...item };
          for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'string' && obj[k].trim()) {
              const t = await translateSmart(obj[k], cfg.langPair);
              if (t) obj[k] = t;
              calls++;
              await sleep(600);
            }
          }
          out.push(obj);
        } else out.push(item);
      }
      update[`features${suffix}`] = out;
    }
    if (Object.keys(update).length) {
      await prisma.product.update({ where: { id: prod.id }, data: update });
      console.log(`  ✔ 产品字段(含features): ${Object.keys(update).length}`);
    }
    // 规格
    for (const spec of prod.productSpecs) {
      const sup = {};
      for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
        if (spec[`label${suffix}`] && String(spec[`label${suffix}`]).trim()) continue;
        const labelT = await translateSmart(spec.label, cfg.langPair);
        if (labelT) sup[`label${suffix}`] = labelT;
        calls++;
        await sleep(600);
        if (hasCn(spec.value)) {
          const valT = await translateSmart(spec.value, cfg.langPair);
          if (valT) sup[`value${suffix}`] = valT;
          calls++;
          await sleep(600);
        }
      }
      if (Object.keys(sup).length) {
        await prisma.productSpec.update({ where: { id: spec.id }, data: sup });
      }
    }
    console.log(`  规格已处理`);
  }
  console.log(`\n完成，共发起 ${calls} 次翻译调用`);
}

main().catch((e) => { console.error('失败:', e); process.exit(1); }).finally(() => prisma.$disconnect());
