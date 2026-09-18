/**
 * ProductTab/ProductCategory/ResourceCategory 语种字段补译（2026-09-01）
 * ProductTab: nameJa/nameKo/nameFr/nameAr
 * ProductCategory: nameJa/nameKo/nameFr/nameAr
 * ResourceCategory: titleJa... / descriptionJa...
 * 百度优先 + MyMemory fallback，QPS=1 节流；已有跳过可续跑
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');

const SUFFIX = ['Ja', 'Ko', 'Fr', 'Ar'];
const BAIDU = { Ja: 'jp', Ko: 'kor', Fr: 'fra', Ar: 'ara' };
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
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal: c.signal,
    });
    const d = await r.json();
    clearTimeout(timer);
    if (d.error_code === '54003' || d.error_code === '54005') return 'QPS';
    if (d.error_code) return 'ERR:' + d.error_code;
    return d.trans_result ? d.trans_result.map((x) => x.dst).join('') : '';
  } catch (e) { clearTimeout(timer); return 'NET:ERR'; }
}

async function translateAll(text) {
  const out = {};
  for (const suf of SUFFIX) {
    let t = null;
    for (let a = 0; a < 3; a++) {
      const r = await baiduTranslate(String(text).trim(), BAIDU[suf]);
      if (r && r !== 'QPS' && !r.startsWith('ERR') && r !== 'NET:ERR') { t = r; break; }
      await sleep(1300);
    }
    out[suf] = t;
    await sleep(1300);
  }
  return out;
}

async function main() {
  // ProductTab
  const tabs = await prisma.productTab.findMany();
  for (const t of tabs) {
    if (t.nameJa) continue;
    if (!hasCn(t.name)) continue;
    console.log(`[tab ${t.slug}] ${t.name}`);
    const tr = await translateAll(t.name);
    await prisma.productTab.update({ where: { id: t.id }, data: { nameJa: tr.Ja, nameKo: tr.Ko, nameFr: tr.Fr, nameAr: tr.Ar } });
  }
  // ProductCategory
  const cats = await prisma.productCategory.findMany();
  for (const c of cats) {
    if (c.nameJa) continue;
    if (!hasCn(c.name)) continue;
    console.log(`[category ${c.slug}] ${c.name}`);
    const tr = await translateAll(c.name);
    await prisma.productCategory.update({ where: { id: c.id }, data: { nameJa: tr.Ja, nameKo: tr.Ko, nameFr: tr.Fr, nameAr: tr.Ar } });
  }
  // ResourceCategory
  const rcs = await prisma.resourceCategory.findMany();
  for (const r of rcs) {
    const needTitle = !r.titleJa && hasCn(r.title);
    const needDesc = !r.descriptionJa && hasCn(r.description);
    if (!needTitle && !needDesc) continue;
    console.log(`[rc ${r.type}] title=${r.title} desc=${(r.description || '').slice(0, 20)}`);
    const data = {};
    if (needTitle) { const tr = await translateAll(r.title); data.titleJa = tr.Ja; data.titleKo = tr.Ko; data.titleFr = tr.Fr; data.titleAr = tr.Ar; }
    if (needDesc) { const tr = await translateAll(r.description); data.descriptionJa = tr.Ja; data.descriptionKo = tr.Ko; data.descriptionFr = tr.Fr; data.descriptionAr = tr.Ar; }
    await prisma.resourceCategory.update({ where: { id: r.id }, data });
  }
  console.log('完成');
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
