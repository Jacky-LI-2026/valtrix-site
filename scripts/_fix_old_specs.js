/**
 * VALTRIX 旧产品（id 9-25）specs 补 value 多语键（valueEn/Ja/Ko/Fr/Ar）
 * value 为纯英文/数字/型号时直接复制；含中文字符才调用小牛翻译
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
  const r = fs.readFileSync(o, 'utf8');
  return r;
}
const HAS_CN = /[\u4e00-\u9fff]/;
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

async function build() {
  const rows = q(`SELECT id, name, specs::text FROM products WHERE id BETWEEN 9 AND 25 ORDER BY id;`);
  const lines = rows.split('\n').filter(Boolean);
  const updates = [];
  for (const line of lines) {
    const [id, name, specsJson] = line.split('|');
    let specs = JSON.parse(specsJson);
    let changed = false;
    for (const s of specs) {
      if (s.value && !s.valueJa) {
        const langs = {};
        for (const [code, to] of [['En', 'en'], ['Ja', 'ja'], ['Ko', 'ko'], ['Fr', 'fr'], ['Ar', 'ar']]) {
          if (!HAS_CN.test(s.value)) {
            langs['value' + code] = s.value;
          } else {
            langs['value' + code] = await niuTranslate(s.value, to).catch(() => s.value);
          }
        }
        Object.assign(s, langs);
        changed = true;
        console.log(`[${id}] ${name} | ${s.name} = ${s.value.slice(0, 30)} → ja: ${langs.valueJa.slice(0, 20)}`);
      }
    }
    if (changed) {
      updates.push(`UPDATE products SET specs = '${JSON.stringify(specs).replace(/'/g, "''")}'::jsonb WHERE id = ${id};`);
    }
  }
  if (!updates.length) { console.log('无需修复'); return; }
  const sql = updates.join('\n');
  fs.writeFileSync('D:/阀门网站/scripts/_fix_old_specs.sql', sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -f "D:/阀门网站/scripts/_fix_old_specs.sql"`, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
  console.log('修复完成，更新', updates.length, '个产品');
}

build().catch(e => { console.error(e); process.exit(1); });
