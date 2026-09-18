/**
 * Fr 语种内容补全脚本（百度优先，MyMemory fallback）
 * 覆盖：行业/新闻/资源/职位/产品缺项 的 Fr 字段
 * 百度 to=fra，MyMemory pair=fr-FR
 * 用法: node scripts/translate-fr-fill.js
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');
const NIU_KEY = getVal('NIU_API_KEY');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function niuTranslate(text) {
  if (!NIU_KEY) return null;
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch('https://api.niutrans.com/NiuTransServer/translation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'zh', to: 'fr', apikey: NIU_KEY, src_text: text }),
      signal: c.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.error_code) return null;
    return d.tgt_text || null;
  } catch (e) { clearTimeout(timer); return null; }
}

async function baiduTranslate(text, to) {
  const salt = Date.now().toString();
  const sign = crypto.createHash('md5').update(APPID + text + salt + KEY).digest('hex');
  const params = new URLSearchParams({ q: text, from: 'zh', to, appid: APPID, salt, sign });
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal: c.signal,
    });
    const d = await r.json();
    clearTimeout(timer);
    if (d.error_code === '54003' || d.error_code === '54005') return 'QPS';
    if (d.error_code) return 'ERR:' + d.error_code;
    return d.trans_result ? d.trans_result.map((x) => x.dst).join('') : '';
  } catch (e) { clearTimeout(timer); return 'NET:ERR'; }
}

async function mmTranslate(text) {
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 12000);
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|fr-FR&de=dev%40zuowentech.com`, { signal: c.signal });
    clearTimeout(timer);
    if (r.status === 429) return null;
    const d = await r.json();
    let t = d?.responseData?.translatedText || '';
    if (t && !t.startsWith('MYMEMORY')) t = t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
    return (t && !t.startsWith('MYMEMORY')) ? t : null;
  } catch (e) { return null; }
}

async function translateSmart(text) {
  if (!text || !String(text).trim()) return null;
  const html = /<\/?[a-z][\s\S]*>/i.test(text);
  let src = String(text);
  if (html) src = text.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\n+/g, '\n').trim();
  // 小牛优先（质量好），失败退避后 MyMemory 兜底
  for (let a = 0; a < 3; a++) {
    const t = await niuTranslate(src);
    if (t && t.trim()) {
      return html ? t.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('') : t;
    }
    await sleep(1400);
  }
  const mm = await mmTranslate(src);
  if (mm) return html ? mm.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('') : mm;
  return null;
}

const hasCn = (t) => /[\u4e00-\u9fff]/.test(t || '');
const missing = (v) => !v || !String(v).trim() || String(v).includes('[翻译结果]');

async function fillScalars(records, fields, label) {
  let done = 0, skipped = 0;
  for (const rec of records) {
    const update = {};
    for (const f of fields) {
      if (missing(rec[f + 'Fr']) && hasCn(rec[f])) {
        const t = await translateSmart(rec[f]);
        if (t && !t.startsWith('ERR')) { update[f + 'Fr'] = t; done++; }
        await sleep(1400);
      } else if (!missing(rec[f + 'Fr'])) skipped++;
    }
    if (Object.keys(update).length) {
      await prisma[rec._model].update({ where: { id: rec.id }, data: update });
    }
  }
  console.log(`  ${label}: 翻译 ${done} 条`);
}

async function main() {
  if (!NIU_KEY) { console.log('小牛 key 缺失，无法翻译 fr'); return; }
  console.log('=== 行业 Fr ===');
  const inds = await prisma.industry.findMany({});
  let iDone = 0;
  for (const ind of inds) {
    const update = {};
    ind._model = 'industry';
    for (const f of ['name', 'tagline', 'description']) {
      if (missing(ind[f + 'Fr']) && hasCn(ind[f])) {
        const t = await translateSmart(ind[f]);
        if (t) { update[f + 'Fr'] = t; iDone++; }
        await sleep(1400);
      }
    }
    // challenges 数组
    if (Array.isArray(ind.challenges) && ind.challenges.length && (!ind.challengesFr || ind.challengesFr.length === 0)) {
      const out = [];
      for (const item of ind.challenges) {
        const t = await translateSmart(item); out.push(t || item); await sleep(1400);
      }
      update.challengesFr = out; iDone++;
    }
    // solutions 对象数组
    if (Array.isArray(ind.solutions) && ind.solutions.length && (!ind.solutionsFr || ind.solutionsFr.length === 0)) {
      const out = [];
      for (const item of ind.solutions) {
        const obj = { ...item };
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === 'string' && obj[k].trim() && hasCn(obj[k])) {
            const t = await translateSmart(obj[k]); if (t) obj[k] = t; await sleep(1400);
          }
        }
        out.push(obj);
      }
      update.solutionsFr = out; iDone++;
    }
    // products 数组
    if (Array.isArray(ind.products) && ind.products.length && (!ind.productsFr || ind.productsFr.length === 0)) {
      const out = [];
      for (const item of ind.products) {
        const t = await translateSmart(item); out.push(t || item); await sleep(1400);
      }
      update.productsFr = out; iDone++;
    }
    // cases 对象数组
    if (Array.isArray(ind.cases) && ind.cases.length && (!ind.casesFr || ind.casesFr.length === 0)) {
      const out = [];
      for (const item of ind.cases) {
        const obj = { ...item };
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === 'string' && obj[k].trim() && hasCn(obj[k])) {
            const t = await translateSmart(obj[k]); if (t) obj[k] = t; await sleep(1400);
          }
        }
        out.push(obj);
      }
      update.casesFr = out; iDone++;
    }
    if (Object.keys(update).length) await prisma.industry.update({ where: { id: ind.id }, data: update });
  }
  console.log(`  行业: 完成 ${iDone} 组`);

  console.log('=== 新闻 Fr ===');
  const news = await prisma.news.findMany({});
  let nDone = 0;
  for (const n of news) {
    const update = {};
    for (const f of ['title', 'summary', 'content']) {
      if (missing(n[f + 'Fr']) && hasCn(n[f])) {
        const t = await translateSmart(n[f]);
        if (t) { update[f + 'Fr'] = t; nDone++; }
        await sleep(1400);
      }
    }
    if (Object.keys(update).length) await prisma.news.update({ where: { id: n.id }, data: update });
  }
  console.log(`  新闻: 翻译 ${nDone} 条`);

  console.log('=== 资源 Fr ===');
  const res = await prisma.resourceItem.findMany({});
  let rDone = 0;
  for (const r of res) {
    const update = {};
    for (const f of ['title', 'description']) {
      if (missing(r[f + 'Fr']) && hasCn(r[f])) {
        const t = await translateSmart(r[f]);
        if (t) { update[f + 'Fr'] = t; rDone++; }
        await sleep(1400);
      }
    }
    if (Object.keys(update).length) await prisma.resourceItem.update({ where: { id: r.id }, data: update });
  }
  console.log(`  资源: 翻译 ${rDone} 条`);

  console.log('=== 职位 Fr ===');
  const jobs = await prisma.job.findMany({});
  let jDone = 0;
  for (const j of jobs) {
    const update = {};
    for (const f of ['title', 'department', 'location', 'type', 'salary', 'experience', 'education']) {
      if (missing(j[f + 'Fr']) && hasCn(j[f])) {
        const t = await translateSmart(j[f]);
        if (t) { update[f + 'Fr'] = t; jDone++; }
        await sleep(1400);
      }
    }
    // Json 数组字段
    for (const f of ['description', 'responsibilities', 'requirements', 'benefits']) {
      const src = j[f];
      const dst = j[f + 'Fr'];
      const srcArr = Array.isArray(src) ? src : (src ? [src] : []);
      const dstEmpty = Array.isArray(dst) ? dst.length === 0 : missing(dst);
      if (srcArr.length && dstEmpty) {
        const out = [];
        for (const item of srcArr) {
          const t = await translateSmart(String(item)); out.push(t || String(item)); await sleep(1400);
        }
        update[f + 'Fr'] = out; jDone++;
      }
    }
    if (Object.keys(update).length) await prisma.job.update({ where: { id: j.id }, data: update });
  }
  console.log(`  职位: 完成 ${jDone} 组`);

  console.log('=== 产品缺项 Fr ===');
  const prods = await prisma.product.findMany({ include: { productSpecs: true } });
  let pDone = 0;
  for (const prod of prods) {
    const update = {};
    for (const f of ['name', 'subtitle', 'summary', 'description']) {
      if (missing(prod[f + 'Fr']) && hasCn(prod[f])) {
        const t = await translateSmart(prod[f]);
        if (t) { update[f + 'Fr'] = t; pDone++; }
        await sleep(1400);
      }
    }
    if (Object.keys(update).length) await prisma.product.update({ where: { id: prod.id }, data: update });
    for (const spec of prod.productSpecs) {
      const sup = {};
      if (missing(spec.labelFr) && hasCn(spec.label)) {
        const t = await translateSmart(spec.label); if (t) sup.labelFr = t; await sleep(1400);
      }
      if (hasCn(spec.value) && missing(spec.valueFr)) {
        const t = await translateSmart(spec.value); if (t) sup.valueFr = t; await sleep(1400);
      }
      if (Object.keys(sup).length) await prisma.productSpec.update({ where: { id: spec.id }, data: sup });
    }
  }
  console.log(`  产品: 翻译 ${pDone} 条`);
  console.log('\n全部完成');
}

main().catch((e) => { console.error('失败:', e); process.exit(1); }).finally(() => prisma.$disconnect());
