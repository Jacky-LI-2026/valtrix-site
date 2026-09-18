/**
 * 产品标量字段补漏：检查每个产品 name/subtitle/summary/description 的各语种缺失并补翻
 * （修复 nameJa 已有导致整组跳过、其他字段漏翻的问题）
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');
const LANG_MAP = { Ja: 'jp', Ko: 'kor', Ar: 'ara' };
const SCALARS = ['name', 'subtitle', 'summary', 'description'];
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

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, model: true } });
  let fixed = 0;
  for (const prod of products) {
    const full = await prisma.product.findUnique({ where: { id: prod.id } });
    const update = {};
    for (const [suffix, to] of Object.entries(LANG_MAP)) {
      for (const f of SCALARS) {
        const target = `${f}${suffix}`;
        const has = full[target] && String(full[target]).trim();
        if (!has) {
          const t = await translateSmart(full[f], to);
          if (t) update[target] = t;
          await sleep(1300);
        }
      }
    }
    if (Object.keys(update).length) {
      await prisma.product.update({ where: { id: prod.id }, data: update });
      console.log(`✔ ${prod.model}: ${Object.keys(update).length} 字段`);
      fixed++;
    }
  }
  console.log(`\n补漏完成，修正 ${fixed} 个产品`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
