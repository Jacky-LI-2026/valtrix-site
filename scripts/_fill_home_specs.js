/**
 * 补全：products.specs 规格名(nameJa/Ko/Fr/Ar) + home_config 文案(cta/seo/banners/features/stats)
 * 翻译源：specs=zh，home=对应字段的 en
 */
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const NIU_KEY = 'e13f45f11354cf7e319cdfa32b639d05';
const SUF = ['Ja', 'Ko', 'Fr', 'Ar'];
const MAP = { Ja: 'ja', Ko: 'ko', Fr: 'fr', Ar: 'ar' };

function q(sql) {
  const fsql = 'D:/企业网站/_q_tmp.sql';
  const fout = 'D:/企业网站/_q_tmp_out.txt';
  fs.writeFileSync(fsql, sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -A -f "${fsql}" -o "${fout}"`, { encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
  return fs.readFileSync(fout, 'utf8').trim();
}
let lastReq = 0;
function throttle(ms = 260) {
  const now = Date.now();
  const wait = Math.max(0, lastReq + ms - now);
  lastReq = now + wait;
  return new Promise(r => setTimeout(r, wait));
}
function niu(text, from, to) {
  return throttle().then(() => new Promise((resolve, reject) => {
    const body = `apikey=${NIU_KEY}&from=${from}&to=${to}&src_text=${encodeURIComponent(text)}`;
    const req = https.request('https://api.niutrans.com/NiuTransServer/translation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.tgt_text) resolve(j.tgt_text);
          else reject(new Error('NIU:' + d.slice(0, 100)));
        } catch (e) { reject(new Error('parse:' + d.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  })).catch(async e => {
    if (/QPS|429|500/.test(String(e.message))) { await new Promise(r => setTimeout(r, 2000)); return niu(text, from, to); }
    throw e;
  });
}
function esc(s) { return String(s).replace(/'/g, "''"); }

const sqlLines = [];
let calls = 0;

async function main() {
  // ========== 1. products.specs ==========
  const specsRaw = q(`SELECT id, specs::text FROM products WHERE jsonb_array_length(specs) > 0 ORDER BY id`);
  for (const row of specsRaw.split('\n')) {
    if (!row) continue;
    const i = row.indexOf('|');
    if (i < 0) continue;
    const id = row.slice(0, i).trim();
    let arr;
    try { arr = JSON.parse(row.slice(i + 1)); } catch (e) { continue; }
    if (!Array.isArray(arr)) continue;
    let changed = false;
    for (const sp of arr) {
      for (const s of SUF) {
        if (!sp['name' + s] && sp.name) {
          calls++;
          sp['name' + s] = await niu(sp.name, 'zh', MAP[s]).catch(() => sp.name);
          changed = true;
        }
      }
    }
    if (changed) sqlLines.push(`UPDATE products SET specs = '${esc(JSON.stringify(arr))}'::jsonb WHERE id = ${id};`);
  }

  // ========== 2. home_config ==========
  const hc = q(`SELECT "ctaTitle","ctaSubtitle","ctaButtonText","seoTitle","seoDesc","seoKeywords",banners::text,features::text,stats::text FROM home_config WHERE "isActive"=true LIMIT 1`);
  if (hc) {
    const p = hc.split('|');
    if (p.length >= 9) {
      const [ct, cs, cb, st, sd, sk, bn, ft, ss] = [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p.slice(8).join('|')];
      const sets = [];
      // 标量后缀列（源=en列）
      const scalar = { ctaTitle: ct, ctaSubtitle: cs, ctaButtonText: cb, seoTitle: st, seoDesc: sd, seoKeywords: sk };
      for (const [col, src] of Object.entries(scalar)) {
        if (!src) continue;
        for (const s of SUF) {
          const has = q(`SELECT count(*) FROM information_schema.columns WHERE table_name='home_config' AND column_name='${col}${s}'`);
          if (has !== '1') continue;
          const cur = q(`SELECT "${col}${s}" FROM home_config LIMIT 1`);
          if (cur) continue;
          calls++;
          const tv = await niu(src, 'en', MAP[s]).catch(() => src);
          sets.push(`"${col}${s}" = '${esc(tv)}'`);
        }
      }
      // JSON 对象字段（en→目标）
      async function fillObjField(obj, field) {
        if (!obj || typeof obj !== 'object') return false;
        let ch = false;
        for (const s of SUF) {
          if (!obj[field]?.[MAP[s]] && obj[field]?.en) {
            calls++;
            obj[field][MAP[s]] = await niu(obj[field].en, 'en', MAP[s]).catch(() => obj[field].en);
            ch = true;
          }
        }
        return ch;
      }
      let chB = false, chF = false, chS = false;
      const banners = JSON.parse(bn || '[]');
      for (const b of banners) {
        for (const f of ['badge', 'title', 'subtitle', 'description', 'ctaText']) chB = (await fillObjField(b, f)) || chB;
      }
      const features = JSON.parse(ft || '[]');
      for (const f of features) {
        chF = (await fillObjField(f, 'title')) || chF;
        chF = (await fillObjField(f, 'description')) || chF;
      }
      const stats = JSON.parse(ss || '[]');
      for (const s of stats) chS = (await fillObjField(s, 'label')) || chS;
      if (chB) sets.push(`banners = '${esc(JSON.stringify(banners))}'::jsonb`);
      if (chF) sets.push(`features = '${esc(JSON.stringify(features))}'::jsonb`);
      if (chS) sets.push(`stats = '${esc(JSON.stringify(stats))}'::jsonb`);
      if (sets.length) sqlLines.push(`UPDATE home_config SET ${sets.join(', ')} WHERE "isActive"=true;`);
    }
  }

  fs.writeFileSync('D:/企业网站/_ml_home_specs.sql', sqlLines.join('\n'), 'utf8');
  console.log('生成 SQL 行数:', sqlLines.length, '| 翻译调用:', calls);
}
main().catch(e => { console.error(e); process.exit(1); });
