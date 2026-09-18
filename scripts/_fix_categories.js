/**
 * VALTRIX product_categories 7-12 补 nameJa/Ko/Fr/Ar（2026-09-08）
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
function niuTranslate(text, to, from = 'zh') {
  return throttle().then(() => new Promise((resolve, reject) => {
    const body = `apikey=${NIU_KEY}&from=${from}&to=${to}&src_text=${encodeURIComponent(text)}`;
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
      return niuTranslate(text, to, from);
    }
    throw e;
  });
}

async function build() {
  const rows = q(`SELECT id, name, "nameEn" FROM product_categories ORDER BY id;`);
  const updates = [];
  for (const line of rows.split('\n').filter(Boolean)) {
    const [id, name, nameEn] = line.split('|');
    const sets = [];
    for (const [code, to] of [['Ja', 'ja'], ['Ko', 'ko'], ['Fr', 'fr'], ['Ar', 'ar']]) {
      const v = await niuTranslate(nameEn, to, 'en').catch(() => name);
      sets.push(`"name${code}" = '${v.replace(/'/g, "''")}'`);
      console.log(`cat${id} ${nameEn} → ${code}: ${v.slice(0, 40)}`);
    }
    updates.push(`UPDATE product_categories SET ${sets.join(', ')} WHERE id = ${id};`);
  }
  const sql = updates.join('\n');
  const out = 'D:/阀门网站/scripts/_fix_categories_out.txt';
  fs.writeFileSync('D:/阀门网站/scripts/_fix_categories.sql', sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -f "D:/阀门网站/scripts/_fix_categories.sql" -o "${out}"`, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
  console.log(fs.readFileSync(out, 'utf8').slice(0, 500));
  fs.unlinkSync(out);
  console.log('category 多语补全完成');
}

build().catch(e => { console.error(e); process.exit(1); });
