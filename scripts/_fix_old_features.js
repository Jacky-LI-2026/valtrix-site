/**
 * VALTRIX 旧产品（9-25）featuresJa/Ko/Fr/Ar 补全；featuresEn 为空也补
 */
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const NIU_KEY = 'e13f45f11354cf7e319cdfa32b639d05';

function q(sql) {
  const f = 'D:/企业网站/_q_tmp.sql', o = 'D:/企业网站/_q_tmp_out.txt';
  fs.writeFileSync(f, sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -A -f "${f}" -o "${o}"`, { encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
  return fs.readFileSync(o, 'utf8');
}
let lastReq = 0;
function throttle(ms = 260) {
  const now = Date.now();
  const wait = Math.max(0, lastReq + ms - now);
  lastReq = now + wait;
  return new Promise(r => setTimeout(r, wait));
}
function niuTranslate(text, to) {
  return throttle().then(() => new Promise((resolve, reject) => {
    const body = `apikey=${NIU_KEY}&from=zh&to=${to}&src_text=${encodeURIComponent(text)}`;
    const req = https.request('https://api.niutrans.com/NiuTransServer/translation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); if (j.tgt_text) resolve(j.tgt_text); else reject(new Error('NIU:' + d.slice(0, 120))); }
        catch (e) { reject(new Error('parse:' + d.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  })).catch(async (e) => {
    if (String(e.message).includes('QPS') || String(e.message).includes('500') || String(e.message).includes('429')) {
      await new Promise(r => setTimeout(r, 2000));
      return niuTranslate(text, to);
    }
    throw e;
  });
}
const SEP = ' 〓 ';
async function translateArray(arr, to) {
  const joined = arr.join(SEP);
  try {
    const out = await niuTranslate(joined, to);
    const parts = out.split(SEP).map(s => s.trim());
    if (parts.length === arr.length) return parts;
  } catch (e) {}
  const res = [];
  for (const item of arr) { try { res.push(await niuTranslate(item, to)); } catch (e) { res.push(item); } }
  return res;
}

async function build() {
  const rows = q(`SELECT id, features::text, "featuresEn"::text, "featuresJa"::text, "featuresKo"::text, "featuresFr"::text, "featuresAr"::text FROM products WHERE id BETWEEN 9 AND 25 ORDER BY id;`);
  const updates = [];
  for (const line of rows.split('\n').filter(Boolean)) {
    const [id, fz, fEn, fJa, fKo, fFr, fAr] = line.split('|');
    const zh = JSON.parse(fz || '[]');
    if (!zh.length) continue;
    const sets = [];
    const jobs = [];
    if (!fEn || fEn === '[]') jobs.push(['featuresEn', 'en']);
    if (!fJa || fJa === '[]') jobs.push(['featuresJa', 'ja']);
    if (!fKo || fKo === '[]') jobs.push(['featuresKo', 'ko']);
    if (!fFr || fFr === '[]') jobs.push(['featuresFr', 'fr']);
    if (!fAr || fAr === '[]') jobs.push(['featuresAr', 'ar']);
    if (!jobs.length) continue;
    for (const [col, to] of jobs) {
      const arr = await translateArray(zh, to);
      sets.push(`"${col}" = '${JSON.stringify(arr).replace(/'/g, "''")}'::jsonb`);
    }
    updates.push(`UPDATE products SET ${sets.join(', ')} WHERE id = ${id};`);
    console.log('产品', id, '补', jobs.map(j => j[0]).join(','));
  }
  if (!updates.length) { console.log('无需修复'); return; }
  const sql = updates.join('\n');
  fs.writeFileSync('D:/阀门网站/scripts/_fix_old_features.sql', sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -f "D:/阀门网站/scripts/_fix_old_features.sql"`, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
  console.log('features 修复完成，更新', updates.length, '个产品');
}

build().catch(e => { console.error(e); process.exit(1); });
