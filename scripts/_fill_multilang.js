/**
 * VALTRIX 多语种批量补全：zh → ja/ko/fr/ar
 * 数据源：本地 DB zuowen_valve；翻译通道：小牛（src_text/tgt_text）
 * 处理类型：text / html / strarr(字符串数组) / objarr(对象数组,fields 递归翻译)
 * 输出：生成 SQL 到 _ml_fill.sql 并执行
 */
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const NIU_KEY = 'e13f45f11354cf7e319cdfa32b639d05';
const SUFFIXES = ['Ja', 'Ko', 'Fr', 'Ar'];

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
        try {
          const j = JSON.parse(d);
          if (j.tgt_text) resolve(j.tgt_text);
          else reject(new Error('NIU:' + d.slice(0, 120)));
        } catch (e) { reject(new Error('parse:' + d.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  })).catch(async (e) => {
    if (String(e.message).includes('QPS') || String(e.message).includes('500') || String(e.message).includes('429')) {
      await new Promise(r => setTimeout(r, 2000));
      return niuTranslate(text, to); // 重试一次
    }
    throw e;
  });
}

/** 数组用分隔符合并翻译，长度不符回退逐项 */
const SEP = ' 〓 ';
async function translateArray(arr, to) {
  const joined = arr.join(SEP);
  try {
    const out = await niuTranslate(joined, to);
    const parts = out.split(SEP).map(s => s.trim());
    if (parts.length === arr.length) return parts;
  } catch (e) { /* fallthrough */ }
  const res = [];
  for (const item of arr) {
    try { res.push(await niuTranslate(item, to)); }
    catch (e) { res.push(item); }
  }
  return res;
}

/** HTML 文本：按标签切分，文本段合并翻译后重组 */
const TAG_RE = /(<[^>]+>)/g;
async function translateHtml(html, to) {
  if (!/<[^>]+>/.test(html)) return niuTranslate(html, to);
  const parts = html.split(TAG_RE);
  const textIdx = parts.map((p, i) => (i % 2 === 0 && p.trim()) ? i : -1).filter(i => i >= 0);
  if (!textIdx.length) return html;
  const joined = textIdx.map(i => parts[i]).join(SEP);
  try {
    const out = await niuTranslate(joined, to);
    const segs = out.split(SEP).map(s => s.trim());
    if (segs.length === textIdx.length) {
      textIdx.forEach((pi, si) => { parts[pi] = segs[si]; });
      return parts.join('');
    }
  } catch (e) { /* fallthrough */ }
  for (const pi of textIdx) {
    try { parts[pi] = await niuTranslate(parts[pi], to); } catch (e) {}
  }
  return parts.join('');
}

async function translateValue(value, type, to, fields) {
  if (value === null || value === undefined || value === '') return value;
  if (type === 'strarr') return translateArray(JSON.parse(JSON.stringify(value)), to);
  if (type === 'html') return translateHtml(String(value), to);
  if (type === 'objarr') {
    const arr = JSON.parse(JSON.stringify(value));
    const out = [];
    for (const item of arr) {
      const o = {};
      for (const k of Object.keys(item)) {
        const v = item[k];
        if (Array.isArray(v)) o[k] = await translateArray(v, to);
        else if (typeof v === 'string') {
          if (fields.includes(k) && !/En$/.test(k)) o[k] = await niuTranslate(v, to).catch(() => v);
          else o[k] = v;
        } else o[k] = v;
      }
      out.push(o);
    }
    return out;
  }
  return niuTranslate(String(value), to).catch(() => value);
}

const ALL_JOBS = [
  { table: 'products', cols: [
    { base: 'name', type: 'text' }, { base: 'subtitle', type: 'text' }, { base: 'summary', type: 'text' },
    { base: 'description', type: 'html' }, { base: 'features', type: 'strarr' }, { base: 'priceNote', type: 'text' },
    { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' }, { base: 'seoKeywords', type: 'text' } ] },
  { table: 'industries', cols: [
    { base: 'name', type: 'text' }, { base: 'tagline', type: 'text' }, { base: 'description', type: 'html' },
    { base: 'challenges', type: 'strarr' }, { base: 'solutions', type: 'strarr' }, { base: 'products', type: 'strarr' },
    { base: 'cases', type: 'strarr' }, { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' },
    { base: 'seoKeywords', type: 'text' }, { base: 'solutionFileName', type: 'text' } ] },
  { table: 'news', cols: [
    { base: 'title', type: 'text' }, { base: 'summary', type: 'text' }, { base: 'content', type: 'html' },
    { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' }, { base: 'seoKeywords', type: 'text' } ] },
  { table: 'services', cols: [
    { base: 'title', type: 'text' }, { base: 'subtitle', type: 'text' }, { base: 'description', type: 'html' },
    { base: 'features', type: 'strarr' }, { base: 'process', type: 'objarr', fields: ['title', 'desc'] },
    { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' }, { base: 'seoKeywords', type: 'text' },
    { base: 'solutionFileName', type: 'text' } ] },
  { table: 'resource_items', cols: [
    { base: 'title', type: 'text' }, { base: 'description', type: 'text' },
    { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' }, { base: 'seoKeywords', type: 'text' } ] },
  { table: 'about_sections', cols: [
    { base: 'title', type: 'text' }, { base: 'subtitle', type: 'text' }, { base: 'content', type: 'objarr', fields: ['heading', 'paragraphs'] },
    { base: 'seoTitle', type: 'text' }, { base: 'seoDescription', type: 'text' }, { base: 'seoKeywords', type: 'text' } ] },
  { table: 'menu', cols: [
    { base: 'name', type: 'text' }, { base: 'description', type: 'text' } ] },
];
const JOBS = process.argv[2] ? ALL_JOBS.filter(j => j.table === process.argv[2]) : ALL_JOBS;

const sqlLines = [];
let totalCalls = 0;

async function main() {
  for (const job of JOBS) {
    const { table, cols } = job;
    // 读全表（id + 各 base 列 + 各语种列），PSQL 输出制表符分隔
    const colNames = cols.map(c => `"${c.base}"`).join(',') + ',' + cols.map(c => SUFFIXES.map(s => `"${c.base}${s}"`).join(',')).join(',');
    const ql = q(`SELECT id||'§'||${cols.map(c => `REPLACE(COALESCE("${c.base}"::text,''),chr(10),' ')`).join("||'§'||")}||'§'||${cols.map(c => SUFFIXES.map(s => `REPLACE(COALESCE("${c.base}${s}"::text,''),chr(10),' ')`).join("||'§'||")).join("||'§'||")} FROM ${table} ORDER BY id`);
    if (!ql) continue;
    for (const row of ql.split('\n')) {
      if (!row) continue;
      const parts = row.split('§');
      if (parts.length < 1 + cols.length * 5) continue;
      const id = parts[0];
      let p = 1;
      const baseVals = [];
      for (const c of cols) {
        baseVals.push({ col: c, val: parseBase(c, parts[p]) });
        p++;
      }
      const langVals = {};
      for (const c of cols) {
        langVals[c.base] = {};
        for (const s of SUFFIXES) { langVals[c.base][s] = parts[p]; p++; }
      }
      // 对每个列 × 语种，缺失则翻译
      for (const bv of baseVals) {
        const { col, val } = bv;
        if (val === null || val === '' || val === '[]' || val === 'null') continue;
        for (const s of SUFFIXES) {
          const existing = langVals[col.base][s];
          if (existing && existing.trim() && existing !== '[]') continue; // 已有
          const parsed = parseVal(col, val);
          if (parsed === null) continue;
          totalCalls++;
          const out = await translateValue(parsed, col.type, s.toLowerCase(), col.fields || []);
          if (out !== null && out !== undefined && out !== '') {
            const setVal = col.type === 'strarr' || col.type === 'objarr' ? JSON.stringify(out) : String(out);
            sqlLines.push(`UPDATE ${table} SET "${col.base}${s}" = '${setVal.replace(/'/g, "''")}' WHERE id = ${id};`);
          }
          process.stdout.write(`\r[${table}] id=${id} ${col.base}${s} 累计:${totalCalls}`);
        }
      }
    }
  }
  fs.writeFileSync('D:/企业网站/_ml_fill.sql', sqlLines.join('\n'), 'utf8');
  console.log('\n生成 SQL 行数:', sqlLines.length, '| 翻译调用:', totalCalls);
}

function parseBase(col, raw) {
  if (col.type === 'strarr' || col.type === 'objarr') {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  return raw;
}
function parseVal(col, raw) {
  if (col.type === 'strarr' || col.type === 'objarr') {
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch (e) { return null; }
  }
  return raw;
}

main().catch(e => { console.error(e); process.exit(1); });
