/**
 * VALTRIX services 内容更新（2026-09-08）
 * 从"工业阀门服务"改为"半导体超高纯管阀件服务"，全语种翻译
 */
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const NIU_KEY = 'e13f45f11354cf7e319cdfa32b639d05';

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
  for (const item of arr) {
    try { res.push(await niuTranslate(item, to)); } catch (e) { res.push(item); }
  }
  return res;
}
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
    if (segs.length === textIdx.length) { textIdx.forEach((pi, si) => { parts[pi] = segs[si]; }); return parts.join(''); }
  } catch (e) {}
  for (const pi of textIdx) { try { parts[pi] = await niuTranslate(parts[pi], to); } catch (e) {} }
  return parts.join('');
}

const LANGS = [
  { code: 'En', to: 'en' }, { code: 'Ja', to: 'ja' }, { code: 'Ko', to: 'ko' }, { code: 'Fr', to: 'fr' }, { code: 'Ar', to: 'ar' },
];

const SERVICES = [
  {
    id: 1, title: '技术支持', subtitle: '超高纯管阀件选型与系统方案',
    description: '<p>提供超高纯管阀件选型、气体系统设计与解决方案服务，帮助客户构建安全可靠的高纯气体输送系统。</p><p>覆盖半导体、生物制药、LED/显示、光伏与氢能等行业的高纯流体控制需求。</p>',
    features: ['选型咨询', '气体系统设计', '材料与表面处理建议', '全流程技术对接'],
  },
  {
    id: 2, title: '定制加工', subtitle: '特殊材质与超高纯表面处理定制',
    description: '<p>支持特殊材质（316L VAR / VIM-VAR）、特殊连接方式与超高纯表面处理定制，包括 UHP 级电抛光与定制接头形式。</p><p>按客户图纸或需求进行洁净室级装配与包装，满足半导体客户个性化需求。</p>',
    features: ['316L VAR / VIM-VAR 材质', '定制接头与连接方式', 'UHP 级电抛光', '洁净室级装配包装'],
  },
  {
    id: 3, title: '维护与备件', subtitle: '高纯系统检修与备件供应',
    description: '<p>提供高纯管阀件检修、密封件更换、洁净室级装配与备件供应服务，保障系统长期稳定运行。</p><p>所有维护操作遵循高纯工艺规范（GP / HP / UHP），确保系统性能与洁净度。</p>',
    features: ['检修服务', '密封件更换', '洁净室级装配', '原厂备件供应'],
  },
  {
    id: 4, title: '培训与咨询', subtitle: '安装、焊接与维护专业培训',
    description: '<p>为客户提供管阀件选型、安装、焊接与维护培训，以及洁净室装配规范咨询，提升客户团队专业能力。</p><p>培训内容涵盖超高纯工艺规范、表面处理要求与系统设计最佳实践。</p>',
    features: ['安装与焊接培训', '洁净室装配规范', '选型与维护培训', '工艺规范咨询'],
  },
];

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function build() {
  const lines = [];
  for (const s of SERVICES) {
    console.log('处理:', s.title);
    const t = {};
    const sub = {};
    const d = {};
    const f = {};
    t['title'] = s.title; sub['subtitle'] = s.subtitle; d['description'] = s.description; f['features'] = JSON.stringify(s.features);
    for (const L of LANGS) {
      t['title' + L.code] = await niuTranslate(s.title, L.to).catch(() => s.title);
      sub['subtitle' + L.code] = await niuTranslate(s.subtitle, L.to).catch(() => s.subtitle);
      d['description' + L.code] = await translateHtml(s.description, L.to);
      f['features' + L.code] = JSON.stringify(await translateArray(s.features, L.to));
    }
    const sets = [];
    for (const k of Object.keys(t)) sets.push(k + '=' + esc(t[k]));
    for (const k of Object.keys(sub)) sets.push(k + '=' + esc(sub[k]));
    for (const k of Object.keys(d)) sets.push(k + '=' + esc(d[k]));
    for (const k of Object.keys(f)) sets.push(k + '=' + esc(f[k]));
    lines.push(`UPDATE services SET ${sets.join(', ')} WHERE id = ${s.id};`);
  }
  const sql = lines.join('\n');
  const out = 'D:/阀门网站/scripts/_update_services_out.txt';
  fs.writeFileSync('D:/阀门网站/scripts/_update_services.sql', sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -f "D:/阀门网站/scripts/_update_services.sql" -o "${out}"`, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
  console.log(fs.readFileSync(out, 'utf8').slice(0, 1000));
  fs.unlinkSync(out);
  console.log('services 更新完成');
}

build().catch(e => { console.error(e); process.exit(1); });
