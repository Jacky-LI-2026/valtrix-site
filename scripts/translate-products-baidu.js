/**
 * 产品多语言补全脚本（百度翻译优先，MyMemory fallback）
 * - Product: name/subtitle/summary/description + features 数组
 * - ProductSpec: label/value（value 含中文才翻）
 * 百度语言码：Ja->jp / Ko->kor / Ar->ara；QPS=1 需间隔 >=1.2s
 * 已有字段自动跳过（可续跑）
 * 用法: node scripts/translate-products-baidu.js
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

// 读百度 key
const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');

const LANG_MAP = {
  Ja: { baiduTo: 'jp', mmPair: 'ja-JP' },
  Ko: { baiduTo: 'kor', mmPair: 'ko-KR' },
  Ar: { baiduTo: 'ara', mmPair: 'ar-SA' },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasCn = (t) => /[\u4e00-\u9fff]/.test(t || '');

async function baiduTranslate(text, to) {
  const salt = Date.now().toString();
  const sign = crypto.createHash('md5').update(APPID + text + salt + KEY).digest('hex');
  const params = new URLSearchParams({ q: text, from: 'zh', to, appid: APPID, salt, sign });
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: c.signal,
    });
    const d = await r.json();
    clearTimeout(timer);
    if (d.error_code === '54003' || d.error_code === '54005') return 'QPS'; // 频率/额度限制
    if (d.error_code) return 'ERR:' + d.error_code;
    return d.trans_result ? d.trans_result.map((x) => x.dst).join('') : '';
  } catch (e) {
    clearTimeout(timer);
    return 'NET:ERR';
  }
}

async function mmTranslate(text, langPair) {
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 12000);
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${langPair}&de=dev%40zuowentech.com`, { signal: c.signal });
    clearTimeout(timer);
    if (r.status === 429) return null;
    const d = await r.json();
    let t = d?.responseData?.translatedText || '';
    if (t && !t.startsWith('MYMEMORY')) t = t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
    return (t && !t.startsWith('MYMEMORY')) ? t : null;
  } catch (e) { return null; }
}

// 统一翻译：百度优先（QPS 限流时降级 MyMemory）
async function translateSmart(text, langPair, baiduTo) {
  if (!text || !String(text).trim()) return null;
  const html = /<\/?[a-z][\s\S]*>/i.test(text);
  let src = String(text);
  if (html) src = text.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\n+/g, '\n').trim();
  // 百度
  for (let a = 0; a < 3; a++) {
    const r = await baiduTranslate(src, baiduTo);
    if (r && r !== 'QPS' && !r.startsWith('ERR') && r !== 'NET:ERR') {
      return html ? r.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('') : r;
    }
    await sleep(1300); // QPS 退避
  }
  // MyMemory fallback
  return await mmTranslate(src, langPair);
}

async function main() {
  if (!APPID || !KEY) { console.log('百度 key 缺失'); return; }
  const products = await prisma.product.findMany({ where: { status: 'published' }, orderBy: { sortOrder: 'asc' }, include: { productSpecs: { orderBy: { sortOrder: 'asc' } } } });
  console.log(`产品: ${products.length} 个`);
  for (const prod of products) {
    console.log(`\n===== ${prod.slug} (${prod.model}) =====`);
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      if (!(prod[`name${suffix}`] && String(prod[`name${suffix}`]).trim())) {
        for (const f of ['name', 'subtitle', 'summary', 'description']) {
          const t = await translateSmart(prod[f], cfg.mmPair, cfg.baiduTo);
          if (t) update[`${f}${suffix}`] = t;
          await sleep(1300);
        }
      }
      // features 数组
      if ((!prod[`features${suffix}`] || !Array.isArray(prod[`features${suffix}`]) || prod[`features${suffix}`].length === 0) && Array.isArray(prod.features) && prod.features.length > 0) {
        const out = [];
        for (const item of prod.features) {
          if (typeof item === 'string') {
            const t = await translateSmart(item, cfg.mmPair, cfg.baiduTo);
            out.push(t || item);
            await sleep(1300);
          } else if (item && typeof item === 'object') {
            const obj = { ...item };
            for (const k of Object.keys(obj)) {
              if (typeof obj[k] === 'string' && obj[k].trim()) {
                const t = await translateSmart(obj[k], cfg.mmPair, cfg.baiduTo);
                if (t) obj[k] = t;
                await sleep(1300);
              }
            }
            out.push(obj);
          } else out.push(item);
        }
        update[`features${suffix}`] = out;
      }
    }
    if (Object.keys(update).length) {
      await prisma.product.update({ where: { id: prod.id }, data: update });
      console.log(`  ✔ 产品字段: ${Object.keys(update).length}`);
    }
    // 规格
    for (const spec of prod.productSpecs) {
      const sup = {};
      for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
        if (!(spec[`label${suffix}`] && String(spec[`label${suffix}`]).trim())) {
          const t = await translateSmart(spec.label, cfg.mmPair, cfg.baiduTo);
          if (t) sup[`label${suffix}`] = t;
          await sleep(1300);
        }
        if (hasCn(spec.value) && !(spec[`value${suffix}`] && String(spec[`value${suffix}`]).trim())) {
          const t = await translateSmart(spec.value, cfg.mmPair, cfg.baiduTo);
          if (t) sup[`value${suffix}`] = t;
          await sleep(1300);
        }
      }
      if (Object.keys(sup).length) {
        await prisma.productSpec.update({ where: { id: spec.id }, data: sup });
      }
    }
    console.log('  规格已处理');
  }
  console.log('\n全部完成');
}

main().catch((e) => { console.error('失败:', e); process.exit(1); }).finally(() => prisma.$disconnect());
