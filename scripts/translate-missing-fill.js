/**
 * 多模块多语言补漏（百度通道）
 * 1. services: mpcvd/technical-support/after-sales 的 featuresEn/processEn + 各服务 processAr 缺失
 * 2. about: culture/history 的 contentEn
 * 3. news: 缺全语种的 title/summary/content
 * 百度语言码：en / jp / kor / ara；QPS=1 需间隔 >=1.2s
 * 用法: node scripts/translate-missing-fill.js
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');
const LANG_MAP = { En: 'en', Ja: 'jp', Ko: 'kor', Ar: 'ara' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    if (d.error_code) return null;
    return d.trans_result ? d.trans_result.map((x) => x.dst).join('') : null;
  } catch (e) { clearTimeout(timer); return null; }
}

async function translateSmart(text, to) {
  if (!text || !String(text).trim()) return null;
  const html = /<\/?[a-z][\s\S]*>/i.test(text);
  let src = String(text);
  if (html) src = text.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\n+/g, '\n').trim();
  for (let a = 0; a < 3; a++) {
    const r = await baiduTranslate(src, to);
    if (r) return html ? r.split('\n').filter((x) => x.trim()).map((p) => `<p>${p}</p>`).join('') : r;
    await sleep(1300);
  }
  return null;
}

async function translateArray(arr, to) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const t = await translateSmart(item, to);
      out.push(t || item);
      await sleep(1300);
    } else if (item && typeof item === 'object') {
      const obj = { ...item };
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          const t = await translateSmart(obj[k], to);
          if (t) obj[k] = t;
          await sleep(1300);
        }
      }
      out.push(obj);
    } else out.push(item);
  }
  return out;
}

async function fillServices() {
  const svcs = await prisma.service.findMany();
  for (const s of svcs) {
    const update = {};
    for (const [suffix, to] of Object.entries(LANG_MAP)) {
      if ((!s[`features${suffix}`] || !Array.isArray(s[`features${suffix}`]) || s[`features${suffix}`].length === 0) && Array.isArray(s.features) && s.features.length) {
        update[`features${suffix}`] = await translateArray(s.features, to);
      }
      if ((!s[`process${suffix}`] || !Array.isArray(s[`process${suffix}`]) || s[`process${suffix}`].length === 0) && Array.isArray(s.process) && s.process.length) {
        update[`process${suffix}`] = await translateArray(s.process, to);
      }
    }
    if (Object.keys(update).length) {
      await prisma.service.update({ where: { id: s.id }, data: update });
      console.log(`✔ services ${s.slug}: ${Object.keys(update).length} 字段`);
    }
  }
}

async function fillAbout() {
  const abs = await prisma.aboutSection.findMany();
  for (const a of abs) {
    const update = {};
    for (const [suffix, to] of Object.entries(LANG_MAP)) {
      if ((!a[`content${suffix}`] || !Array.isArray(a[`content${suffix}`]) || a[`content${suffix}`].length === 0) && Array.isArray(a.content) && a.content.length) {
        const out = [];
        for (const block of a.content) {
          const nb = { blockId: block.blockId || '', heading: '', paragraphs: [] };
          if (typeof block.heading === 'string' && block.heading.trim()) {
            nb.heading = (await translateSmart(block.heading, to)) || block.heading;
            await sleep(1300);
          }
          if (Array.isArray(block.paragraphs)) {
            for (const p of block.paragraphs) {
              const t = await translateSmart(p, to);
              nb.paragraphs.push(t || p);
              await sleep(1300);
            }
          }
          out.push(nb);
        }
        update[`content${suffix}`] = out;
      }
    }
    if (Object.keys(update).length) {
      await prisma.aboutSection.update({ where: { id: a.id }, data: update });
      console.log(`✔ about ${a.slug}: ${Object.keys(update).length} 字段`);
    }
  }
}

async function fillNews() {
  const news = await prisma.news.findMany();
  for (const n of news) {
    const update = {};
    for (const [suffix, to] of Object.entries(LANG_MAP)) {
      if (!(n[`title${suffix}`] && String(n[`title${suffix}`]).trim())) {
        const t = await translateSmart(n.title, to);
        if (t) update[`title${suffix}`] = t;
        await sleep(1300);
      }
      if (!(n[`summary${suffix}`] && String(n[`summary${suffix}`]).trim())) {
        const t = await translateSmart(n.summary, to);
        if (t) update[`summary${suffix}`] = t;
        await sleep(1300);
      }
      if (!(n[`content${suffix}`] && String(n[`content${suffix}`]).trim())) {
        const t = await translateSmart(n.content, to);
        if (t) update[`content${suffix}`] = t;
        await sleep(1300);
      }
    }
    if (Object.keys(update).length) {
      await prisma.news.update({ where: { id: n.id }, data: update });
      console.log(`✔ news id=${n.id} ${n.slug}: ${Object.keys(update).length} 字段`);
    }
  }
}

async function main() {
  if (!APPID || !KEY) { console.log('百度 key 缺失'); return; }
  await fillServices();
  await fillAbout();
  await fillNews();
  console.log('\n全部完成');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
