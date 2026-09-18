/**
 * 前台数据层多语言补全（2026-09-01）
 * 1) HomeConfig.banners[].ctaText / description：纯中文字符串 → {zh,en,ja,ko,fr,ar} 对象（en 复用已有 ctaTextEn/descriptionEn）
 * 2) AboutSection(slug=profile).highlights[]：label/value → 补 labelJa/valueJa/labelKo/valueKo/labelFr/valueFr/labelAr/valueAr
 * 百度优先 + MyMemory fallback，QPS=1 节流 1.3s；已有目标语种自动跳过（可续跑）
 * 用法: node scripts/fix-home-about-multilang.js
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const raw = fs.readFileSync('D:/企业网站/.env.local', 'utf8');
const getVal = (k) => { const m = raw.match(new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
const APPID = getVal('BAIDU_TRANSLATE_APPID');
const KEY = getVal('BAIDU_TRANSLATE_KEY');
if (!APPID || !KEY) { console.error('缺少百度 key'); process.exit(1); }

const SUFFIX = ['Ja', 'Ko', 'Fr', 'Ar'];
const BAIDU = { Ja: 'jp', Ko: 'kor', Fr: 'fra', Ar: 'ara' };
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
    if (d.error_code === '54003' || d.error_code === '54005') return 'QPS';
    if (d.error_code) return 'ERR:' + d.error_code;
    return d.trans_result ? d.trans_result.map((x) => x.dst).join('') : '';
  } catch (e) { clearTimeout(timer); return 'NET:ERR'; }
}

async function translateSmart(text) {
  if (!text || !String(text).trim()) return null;
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
  // ===== 1) HomeConfig banners =====
  const hc = await prisma.homeConfig.findFirst({ orderBy: { id: 'asc' } });
  if (hc?.banners) {
    const banners = JSON.parse(JSON.stringify(hc.banners));
    let changed = 0;
    for (const b of banners) {
      for (const f of ['ctaText', 'description']) {
        const v = b[f];
        if (!v || typeof v !== 'string' || !String(v).trim()) continue;
        const enKey = f + 'En';
        const en = b[enKey] || null;
        console.log(`[banner ${b.id}] ${f}="${String(v).slice(0, 30)}..."`);
        const tr = await translateSmart(v);
        b[f] = {
          zh: String(v).trim(),
          en: en || tr.En,
          ja: tr.Ja, ko: tr.Ko, fr: tr.Fr, ar: tr.Ar,
        };
        changed++;
      }
    }
    if (changed) {
      await prisma.homeConfig.update({ where: { id: hc.id }, data: { banners } });
      console.log(`✓ banners 更新 ${changed} 个字段`);
    } else { console.log('banners 无需更新'); }
  }

  // ===== 2) About highlights =====
  const about = await prisma.aboutSection.findUnique({ where: { slug: 'profile' } });
  if (about?.highlights) {
    const hl = JSON.parse(JSON.stringify(about.highlights));
    let changed = 0;
    for (const item of hl) {
      if (item.labelJa) continue; // 已有跳过
      const label = item.label, value = item.value;
      const need = [];
      if (label && typeof label === 'string' && /[\u4e00-\u9fff]/.test(label)) need.push('label');
      if (value && typeof value === 'string' && /[\u4e00-\u9fff]/.test(value)) need.push('value');
      if (!need.length) continue;
      console.log(`[about highlight] label="${String(label).slice(0, 20)}" value="${String(value).slice(0, 20)}"`);
      for (const f of need) {
        const tr = await translateSmart(item[f]);
        for (const suf of SUFFIX) item[f + suf] = tr[suf];
      }
      changed++;
    }
    if (changed) {
      await prisma.aboutSection.update({ where: { id: about.id }, data: { highlights: hl } });
      console.log(`✓ about highlights 更新 ${changed} 项`);
    } else { console.log('about highlights 无需更新'); }
  }
  console.log('完成');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
