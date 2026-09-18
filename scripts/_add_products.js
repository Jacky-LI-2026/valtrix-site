/**
 * VALTRIX 产品线补全（2026-09-08）
 * 依据：E:\芯阀\_manual_text.txt（芯阀科技产品手册文本提取）
 * 新增 14 个产品系列，全语种翻译（小牛 zh→en/ja/ko/fr/ar），并清空全部产品价格（价格保密）
 * 输出：_add_products.sql 并执行
 */
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const NIU_KEY = 'e13f45f11354cf7e319cdfa32b639d05';
const OUT_SQL = 'D:/阀门网站/scripts/_add_products.sql';

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
    if (segs.length === textIdx.length) {
      textIdx.forEach((pi, si) => { parts[pi] = segs[si]; });
      return parts.join('');
    }
  } catch (e) {}
  for (const pi of textIdx) {
    try { parts[pi] = await niuTranslate(parts[pi], to); } catch (e) {}
  }
  return parts.join('');
}

const LANGS = [
  { code: 'En', to: 'en' },
  { code: 'Ja', to: 'ja' },
  { code: 'Ko', to: 'ko' },
  { code: 'Fr', to: 'fr' },
  { code: 'Ar', to: 'ar' },
];

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// ============ 新产品数据定义（基于产品手册） ============
const PRODUCTS = [
  {
    tabId: 36, categoryId: 8, slug: 'weld-fitting-b-series', model: '316L-BE/BT/ID/IT/IV Series',
    name: '长焊接接头 B 系列',
    subtitle: '直通/弯头/三通/四通全系列对焊接头',
    summary: 'B 系列长焊接接头涵盖直通、45° 弯头、90° 弯头、变径弯头、三通、变径三通、立体三通、四通及焊接环等 11 种形式。端部平直无毛刺以保证对准性，关键部位 100% 视觉检验，内表面电解抛光可选 Ra5μin。适用于高纯与超高纯气体管路系统。',
    description: '<p>B 系列长焊接接头专为半导体超高纯管路设计，加工精确、端部平直无毛刺，保证与管径精确匹配。每个接头带有永久可追溯标识。</p><p>材料可选 316L、316L VAR、316L VIM-VAR，浸润面粗糙度 Ra5μin（0.13μm）至 Ra15μin（0.4μm），工艺规范覆盖标准（GP）、高纯（HP）与超高纯（UHP）。工作温度范围 -198℃ 至 538℃。</p>',
    features: ['端部平直无毛刺，提高对准性', '100% 视觉检验，永久追溯标识', '内表面电解抛光 Ra5μin 可选', '316L VAR / VIM-VAR 材料可选', 'GP / HP / UHP 三种工艺规范'],
    specs: [
      { name: '形式', value: '直通、45°/90°弯头、三通、四通等 11 种' },
      { name: '工作压力', value: '按规格最高 8500psig' },
      { name: '材料', value: '316L / 316L VAR / 316L VIM-VAR' },
      { name: '表面粗糙度', value: 'Ra5 ~ Ra15μin' },
      { name: '工作温度', value: '-198℃ ~ 538℃' },
    ],
    coverImage: '/uploads/oem/BE.jpg',
  },
  {
    tabId: 35, categoryId: 7, slug: 'o-ring-face-seal-o-series', model: '316L-OJ-OR Series',
    name: 'O 形圈面密封接头 O 系列',
    subtitle: 'O 形圈密封，真空至高压可靠密封',
    summary: 'O 系列 O 形圈面密封接头，O 形圈保证从真空到高压的完美密封，尺寸范围 1/8" 至 1"。螺母端测试孔便于泄漏测试，内螺纹螺母镀银，标准表面粗糙度 Ra10μin。可选多种 O 形圈材料以适应不同温度与介质。',
    description: '<p>O 系列面密封接头采用 O 形圈密封，保证从真空到高压的可靠密封性能；与接管光滑连接确保良好密封。每个接头使用氦气进行泄漏测试，最大允许泄漏率 4x10⁻⁹ stdcm³/s。</p><p>O 形圈可选 FKM（70/90 硬度）、PTFE、丁腈橡胶、全氟橡胶、乙丙橡胶，工作温度 -45℃ 至 287℃。内螺纹螺母镀银，易于安装与维护。</p>',
    features: ['O 形圈密封，真空至高压', '螺母端测试孔便于泄漏测试', '内螺纹螺母镀银', '氦气泄漏测试 4x10⁻⁹ stdcm³/s', '尺寸范围 1/8" 至 1"'],
    specs: [
      { name: '工作压力', value: '最高 11200psig' },
      { name: 'O 形圈材料', value: 'FKM / PTFE / 丁腈 / 全氟 / 乙丙' },
      { name: '工作温度', value: '-45℃ ~ 287℃（视 O 形圈）' },
      { name: '泄漏率', value: '≤ 4x10⁻⁹ stdcm³/s（氦）' },
      { name: '材料', value: '316L / 316SS' },
    ],
    coverImage: '/uploads/oem/GG_1.jpg',
  },
  {
    tabId: 35, categoryId: 7, slug: 'cf-flange-weld-fitting', model: '316L-CF16-TB4 Series',
    name: 'CF 法兰焊接接头',
    subtitle: 'CF 法兰转对焊 / 波纹管连接',
    summary: 'CF 法兰焊接接头，CF16 / CF25 / CF40 法兰与对焊接管、波纹管组合，金属垫片密封，适用于超高真空与超高纯工艺系统，提供法兰转 1/4"-1/2" 对焊及波纹管等多种形式。',
    description: '<p>CF 法兰焊接接头为超高真空与超高纯工艺系统提供可靠金属密封连接，法兰面精度高，配合对焊接管、波纹管实现灵活布局。</p><p>材料 316L，可选 CF16、CF25、CF40 法兰规格，焊接端适配 1/4"、3/8"、1/2" 英制管与 6-12mm 公制管。</p>',
    features: ['CF 金属垫片密封', '法兰转对焊 / 波纹管', '316L 材料', '超高真空兼容'],
    specs: [
      { name: '法兰规格', value: 'CF16 / CF25 / CF40' },
      { name: '焊接端', value: '1/4" ~ 1/2" 对焊、波纹管' },
      { name: '材料', value: '316L' },
      { name: '密封形式', value: '金属垫片' },
    ],
    coverImage: '/uploads/oem/GJ_1.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'dv3-low-pressure-high-flow', model: '316L-DV3 Series',
    name: '低压大流量隔膜阀',
    subtitle: '低压大流量，CV 2.8',
    summary: 'DV3 系列低压大流量隔膜阀，工作压力最高 1.72MPa，流量系数 CV 2.8。全封闭阀座设计具有优越的抗膨胀和防污染能力，内部无螺纹和弹簧，可完全清扫流道，钴镍合金隔膜提高强度和抗腐蚀性，适用于超高纯气体大流量输送。',
    description: '<p>DV3 系列低压大流量隔膜阀内部容积小、极少颗粒生成，全封闭阀座设计具有优越的抗膨胀和防污染能力。内部无螺纹和弹簧，可完全清扫流道。</p><p>钴镍合金隔膜提高强度和抗腐蚀性，使用寿命长。手动或气动类型可选，适用于超高纯应用。</p>',
    features: ['大流量 CV 2.8', '全封闭阀座设计', '内部无螺纹和弹簧', '钴镍合金隔膜', '手动 / 气动可选'],
    specs: [
      { name: '工作压力', value: 'MAX. 1.72MPa' },
      { name: '流量系数 CV', value: '2.8' },
      { name: '阀座材料', value: 'PCTFE / PFA' },
      { name: '工作温度', value: '-23℃ ~ 150℃' },
      { name: '泄漏率', value: '≤ 5x10⁻¹⁰ stdcm³/s（阀座 ≤ 1x10⁻⁹）' },
    ],
    coverImage: '/uploads/oem/dv22a-mr8.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'dv4-high-pressure-low-flow', model: '316L-DV4 Series',
    name: '高压小流量隔膜阀',
    subtitle: '高压 20.7MPa，小流量 CV 0.26',
    summary: 'DV4 系列高压小流量隔膜阀，工作压力最高 20.7MPa（3000psig），流量系数 CV 0.26。全封闭阀座设计，内部无螺纹和弹簧，钴镍合金隔膜，内通径 4.1mm，适用于高压高纯气体精密控制。',
    description: '<p>DV4 系列高压小流量隔膜阀内部容积小、极少颗粒生成，全封闭阀座设计具有优越的抗膨胀和防污染能力。内部无螺纹和弹簧，可完全清扫流道。</p><p>钴镍合金隔膜提高强度和抗腐蚀性。PCTFE 或 PI 阀座可选，手动或气动类型可选，适用于超高纯高压应用。</p>',
    features: ['高压 20.7MPa', '小流量 CV 0.26', '全封闭阀座设计', '内部无螺纹和弹簧', '钴镍合金隔膜'],
    specs: [
      { name: '工作压力', value: 'MAX. 20.7MPa（3000psig）' },
      { name: '流量系数 CV', value: '0.26' },
      { name: '内通径', value: '4.1mm' },
      { name: '阀座材料', value: 'PCTFE / PI' },
      { name: '泄漏率', value: '≤ 5x10⁻¹⁰ stdcm³/s' },
    ],
    coverImage: '/uploads/oem/dv12a-mr4.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'dv5-high-pressure-medium-flow', model: '316L-DV5 Series',
    name: '高压中流量隔膜阀',
    subtitle: '手动 24.1MPa / 气动 20.7MPa，CV 0.8',
    summary: 'DV5 系列高压中流量隔膜阀，手动工作压力最高 24.1MPa，气动工作压力最高 20.7MPa，流量系数 CV 0.8。全封闭阀座设计，钴镍合金隔膜，适用于高压高纯气体中流量控制。',
    description: '<p>DV5 系列高压中流量隔膜阀采用全封闭阀座设计，具有优越的抗膨胀和防污染能力；内部无螺纹和弹簧，可完全清扫流道。</p><p>钴镍合金隔膜提高强度和抗腐蚀性，使用寿命长。手动或气动类型可选，适用于超高纯高压应用。</p>',
    features: ['手动 24.1MPa / 气动 20.7MPa', '中流量 CV 0.8', '全封闭阀座设计', '内部无螺纹和弹簧', '钴镍合金隔膜'],
    specs: [
      { name: '手动工作压力', value: 'MAX. 24.1MPa' },
      { name: '气动工作压力', value: 'MAX. 20.7MPa' },
      { name: '流量系数 CV', value: '0.8' },
      { name: '阀座材料', value: 'PCTFE / PFA' },
      { name: '泄漏率', value: '≤ 5x10⁻¹⁰ stdcm³/s' },
    ],
    coverImage: '/uploads/oem/dv12a-mr4.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'dv6-medium-pressure-medium-flow', model: '316L-DV6 Series',
    name: '中压中流量隔膜阀',
    subtitle: '中压 2.07MPa，CV 0.65',
    summary: 'DV6 系列中压中流量隔膜阀，工作压力最高 2.07MPa，流量系数 CV 0.65。全封闭阀座设计，内部无螺纹和弹簧，钴镍合金隔膜，适用于中等压力高纯气体流量控制。',
    description: '<p>DV6 系列中压中流量隔膜阀内部容积小、极少颗粒生成，全封闭阀座设计具有优越的抗膨胀和防污染能力。</p><p>钴镍合金隔膜提高强度和抗腐蚀性，手动或气动类型可选，适用于超高纯应用。</p>',
    features: ['中压 2.07MPa', '中流量 CV 0.65', '全封闭阀座设计', '内部无螺纹和弹簧', '钴镍合金隔膜'],
    specs: [
      { name: '工作压力', value: 'MAX. 2.07MPa' },
      { name: '流量系数 CV', value: '0.65' },
      { name: '阀座材料', value: 'PCTFE / PFA' },
      { name: '泄漏率', value: '≤ 5x10⁻¹⁰ stdcm³/s' },
    ],
    coverImage: '/uploads/oem/dv22a-mr8.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'dv7-high-pressure-spring', model: '316L-DV7 Series',
    name: '高压弹簧隔膜阀',
    subtitle: '弹簧加载，高压 24.1MPa',
    summary: 'DV7 系列高压弹簧隔膜阀，手动与气动工作压力均最高 24.1MPa，流量系数 CV 0.14/0.3（手动）、0.2（气动）。弹簧加载阀座设计，适用于高压高纯气体的可靠截止与调节。',
    description: '<p>DV7 系列高压弹簧隔膜阀采用弹簧加载阀座设计，在高压工况下提供可靠的密封与截止性能。</p><p>钴镍合金隔膜提高强度和抗腐蚀性，手动或气动类型可选，适用于超高纯高压应用。</p>',
    features: ['弹簧加载阀座', '高压 24.1MPa', 'CV 0.14 / 0.3（手动）', '气动 CV 0.2'],
    specs: [
      { name: '手动工作压力', value: 'MAX. 24.1MPa' },
      { name: '气动工作压力', value: 'MAX. 24.1MPa' },
      { name: '流量系数 CV', value: '0.14 / 0.3（手动）、0.2（气动）' },
      { name: '阀座材料', value: 'PCTFE / PFA' },
    ],
    coverImage: '/uploads/oem/dv12a-mr4.jpg',
  },
  {
    tabId: 37, categoryId: 9, slug: 'ald-atomic-layer-deposition', model: '316L-ALD Series',
    name: '原子层沉积隔膜阀',
    subtitle: 'ALD 专用，CV 0.27 / 0.62',
    summary: '专为原子层沉积（ALD）工艺设计的隔膜阀，工作压力最高 1MPa，流量系数 CV 0.27 / 0.62。极小的内腔容积与快速响应特性，适用于 ALD / CVD 前驱体精确输送与脉冲控制。',
    description: '<p>原子层沉积隔膜阀专为 ALD 工艺优化，极小的内部容积确保前驱体剂量精确，阀座与隔膜材料经特殊选型，适应腐蚀性前驱体介质。</p><p>工作压力最高 1MPa，CV 0.27 / 0.62 两种规格可选，适用于半导体薄膜沉积工艺气体控制。</p>',
    features: ['ALD 工艺专用', '极小内腔容积', '快速响应', 'CV 0.27 / 0.62'],
    specs: [
      { name: '工作压力', value: 'MAX. 1MPa' },
      { name: '流量系数 CV', value: '0.27 / 0.62' },
      { name: '适用工艺', value: 'ALD / CVD' },
      { name: '阀座材料', value: 'PCTFE / PFA' },
    ],
    coverImage: '/uploads/oem/dv12a-mr4.jpg',
  },
  {
    tabId: 38, categoryId: 10, slug: 'prt2-small-flow-sensitive', model: '316L-PRT2C-SMR4',
    name: '小流量灵敏减压阀',
    subtitle: '联接式膜片，入口 24.1MPa，CV 0.13 / 0.16',
    summary: 'PRT2 系列小流量灵敏减压阀，联接式膜片设计，最大入口压力 24.1MPa（3500psig），流量系数 CV 0.13 / 0.16。阀体 316L/316LVAR，膜片与阀芯采用 Hastelloy，适用于高纯气体精密压力调节。',
    description: '<p>PRT2 系列小流量灵敏减压阀适用于高纯气体的压力调节，入口压力可达 3500psig。膜片和阀芯为联结一体式，提升调节稳定性。</p><p>阀体材质 316L/316LVAR，膜片和阀芯采用 Hastelloy，出口压力 10-300psig 多档可选。</p>',
    features: ['联接式膜片设计', '入口压力 24.1MPa', 'Hastelloy 膜片与阀芯', '316L / 316LVAR 阀体', 'GP / HP / UHP 工艺'],
    specs: [
      { name: '最大入口压力', value: '24.1MPa（3500psig）' },
      { name: '流量系数 CV', value: '0.13 / 0.16' },
      { name: '出口压力', value: '10、30、60、100、150、300psig' },
      { name: '阀体', value: '316L / 316LVAR' },
      { name: '膜片 / 阀芯', value: 'Hastelloy' },
    ],
    coverImage: '/uploads/oem/prt1-mr4.jpg',
  },
  {
    tabId: 38, categoryId: 10, slug: 'prt3-large-flow-sensitive', model: '316L-PRT3C-SMR4',
    name: '大流量灵敏减压阀',
    subtitle: '联接式膜片，入口 11.7MPa，CV 0.9 / 1.1',
    summary: 'PRT3 系列大流量灵敏减压阀，联接式膜片设计，最大入口压力 11.7MPa，流量系数 CV 0.9 / 1.1。Hastelloy 膜片与阀芯，适用于高纯气体大流量精密减压。',
    description: '<p>PRT3 系列大流量灵敏减压阀适用于高纯气体的大流量压力调节，入口压力最高 11.7MPa。</p><p>膜片和阀芯为联结一体式，采用 Hastelloy 材料，阀体 316L/316LVAR，适用于高纯与超高纯工艺气体系统。</p>',
    features: ['联接式膜片设计', '入口压力 11.7MPa', '大流量 CV 0.9 / 1.1', 'Hastelloy 膜片与阀芯'],
    specs: [
      { name: '最大入口压力', value: '11.7MPa' },
      { name: '流量系数 CV', value: '0.9 / 1.1' },
      { name: '阀体', value: '316L / 316LVAR' },
      { name: '膜片 / 阀芯', value: 'Hastelloy' },
    ],
    coverImage: '/uploads/oem/prt1-mr4.jpg',
  },
  {
    tabId: 38, categoryId: 10, slug: 'pre2-small-flow-sensitive', model: '316L-PRE2C-SMR4',
    name: '小流量灵敏减压阀',
    subtitle: '自由膜片，入口 24.1MPa，CV 0.13',
    summary: 'PRE2 系列小流量灵敏减压阀，自由膜片设计，最大入口压力 24.1MPa（3500psig），流量系数 CV 0.13。阀体 316L/316LVAR，膜片与阀芯采用 Hastelloy，适用于高纯气体精密压力调节。',
    description: '<p>PRE2 系列小流量灵敏减压阀适用于高纯气体的压力调节，入口压力可达 3500psig。自由膜片设计提供稳定的输出压力。</p><p>阀体材质 316L/316LVAR，膜片和阀芯采用 Hastelloy，出口压力 10-300psig 多档可选。</p>',
    features: ['自由膜片设计', '入口压力 24.1MPa', 'Hastelloy 膜片与阀芯', '316L / 316LVAR 阀体'],
    specs: [
      { name: '最大入口压力', value: '24.1MPa（3500psig）' },
      { name: '流量系数 CV', value: '0.13' },
      { name: '出口压力', value: '10、30、60、100、150、300psig' },
      { name: '膜片 / 阀芯', value: 'Hastelloy' },
    ],
    coverImage: '/uploads/oem/pre1-mr4.jpg',
  },
  {
    tabId: 38, categoryId: 10, slug: 'pre3-large-flow-sensitive', model: '316L-PRE3C-SMR4',
    name: '大流量灵敏减压阀',
    subtitle: '自由膜片，入口 4.14MPa，CV 1.1',
    summary: 'PRE3 系列大流量灵敏减压阀，自由膜片设计，最大入口压力 4.14MPa，流量系数 CV 1.1。Hastelloy 膜片与阀芯，适用于高纯气体大流量精密减压。',
    description: '<p>PRE3 系列大流量灵敏减压阀适用于高纯气体的大流量压力调节，入口压力最高 4.14MPa。</p><p>自由膜片设计，膜片和阀芯采用 Hastelloy，阀体 316L/316LVAR，适用于高纯与超高纯工艺气体系统。</p>',
    features: ['自由膜片设计', '入口压力 4.14MPa', '大流量 CV 1.1', 'Hastelloy 膜片与阀芯'],
    specs: [
      { name: '最大入口压力', value: '4.14MPa' },
      { name: '流量系数 CV', value: '1.1' },
      { name: '阀体', value: '316L / 316LVAR' },
      { name: '膜片 / 阀芯', value: 'Hastelloy' },
    ],
    coverImage: '/uploads/oem/pre1-mr4.jpg',
  },
  {
    tabId: 40, categoryId: 12, slug: 'ft6-sintered-stainless-filter', model: '316L-FT6 Series',
    name: '不锈钢滤芯过滤器',
    subtitle: '烧结金属滤芯 2.5nm，21.0MPa',
    summary: 'FT6 系列不锈钢滤芯气体过滤器，工作压力最高 21.0MPa，烧结金属滤芯过滤精度 2.5 纳米。316L 全焊接结构，适用于超高纯气体深度过滤。',
    description: '<p>FT6 系列不锈钢滤芯气体过滤器采用烧结金属滤芯，过滤精度 2.5 纳米，为超高纯气体系统提供可靠的颗粒过滤。</p><p>工作压力最高 21.0MPa，316L 全焊接结构，电抛光（EP）可选，适用于半导体工艺气体过滤。</p>',
    features: ['烧结金属滤芯 2.5nm', '工作压力 21.0MPa', '316L 全焊接结构', 'EP 电抛光可选'],
    specs: [
      { name: '工作压力', value: 'MAX. 21.0MPa' },
      { name: '过滤精度', value: '2.5nm（烧结金属滤芯）' },
      { name: '材料', value: '316L 全焊接' },
      { name: '表面处理', value: 'EP 电抛光可选' },
    ],
    coverImage: '/uploads/oem/ft4-mr4.png',
  },
];

// ============ 翻译并生成 SQL ============
async function translateSpecs(specs) {
  const out = [];
  for (const s of specs) {
    const o = { name: s.name, value: s.value };
    for (const L of LANGS) {
      o['name' + L.code] = await niuTranslate(s.name, L.to).catch(() => s.name);
      o['value' + L.code] = await niuTranslate(s.value, L.to).catch(() => s.value);
    }
    out.push(o);
  }
  return out;
}

async function build() {
  const lines = [];
  let sort = 30;
  for (const p of PRODUCTS) {
    console.log('处理:', p.name);
    // 翻译字段
    const nameEn = await niuTranslate(p.name, 'en').catch(() => p.name);
    const nameJa = await niuTranslate(p.name, 'ja').catch(() => p.name);
    const nameKo = await niuTranslate(p.name, 'ko').catch(() => p.name);
    const nameFr = await niuTranslate(p.name, 'fr').catch(() => p.name);
    const nameAr = await niuTranslate(p.name, 'ar').catch(() => p.name);
    const subEn = await niuTranslate(p.subtitle, 'en').catch(() => p.subtitle);
    const subJa = await niuTranslate(p.subtitle, 'ja').catch(() => p.subtitle);
    const subKo = await niuTranslate(p.subtitle, 'ko').catch(() => p.subtitle);
    const subFr = await niuTranslate(p.subtitle, 'fr').catch(() => p.subtitle);
    const subAr = await niuTranslate(p.subtitle, 'ar').catch(() => p.subtitle);
    const sumEn = await translateHtml(p.summary, 'en');
    const sumJa = await translateHtml(p.summary, 'ja');
    const sumKo = await translateHtml(p.summary, 'ko');
    const sumFr = await translateHtml(p.summary, 'fr');
    const sumAr = await translateHtml(p.summary, 'ar');
    const descEn = await translateHtml(p.description, 'en');
    const descJa = await translateHtml(p.description, 'ja');
    const descKo = await translateHtml(p.description, 'ko');
    const descFr = await translateHtml(p.description, 'fr');
    const descAr = await translateHtml(p.description, 'ar');
    const feaEn = await translateArray(p.features, 'en');
    const feaJa = await translateArray(p.features, 'ja');
    const feaKo = await translateArray(p.features, 'ko');
    const feaFr = await translateArray(p.features, 'fr');
    const feaAr = await translateArray(p.features, 'ar');
    const specs = await translateSpecs(p.specs);
    sort += 1;

    const cols = [
      '"tabId"', '"categoryId"', 'slug', 'model', 'name', '"nameEn"', '"nameJa"', '"nameKo"', '"nameFr"', '"nameAr"',
      'subtitle', '"subtitleEn"', '"subtitleJa"', '"subtitleKo"', '"subtitleFr"', '"subtitleAr"',
      'summary', '"summaryEn"', '"summaryJa"', '"summaryKo"', '"summaryFr"', '"summaryAr"',
      'description', '"descriptionEn"', '"descriptionJa"', '"descriptionKo"', '"descriptionFr"', '"descriptionAr"',
      'features', '"featuresEn"', '"featuresJa"', '"featuresKo"', '"featuresFr"', '"featuresAr"',
      'specs', '"coverImage"', '"sortOrder"', 'status', '"publishedAt"', '"createdAt"', '"updatedAt"',
    ];
    const vals = [
      p.tabId, p.categoryId, p.slug, p.model, p.name, nameEn, nameJa, nameKo, nameFr, nameAr,
      p.subtitle, subEn, subJa, subKo, subFr, subAr,
      p.summary, sumEn, sumJa, sumKo, sumFr, sumAr,
      p.description, descEn, descJa, descKo, descFr, descAr,
      JSON.stringify(p.features), JSON.stringify(feaEn), JSON.stringify(feaJa), JSON.stringify(feaKo), JSON.stringify(feaFr), JSON.stringify(feaAr),
      JSON.stringify(specs), p.coverImage, sort, 'published', 'NOW()', 'NOW()', 'NOW()',
    ];
    lines.push(`INSERT INTO products (${cols.join(',')}) VALUES (${vals.map(esc).join(',')});`);
  }
  // 清空价格（价格保密，前台不展示）
  lines.push(`UPDATE products SET price = NULL, "priceMin" = NULL, "priceMax" = NULL WHERE price IS NOT NULL OR "priceMin" IS NOT NULL OR "priceMax" IS NOT NULL;`);
  lines.push(`UPDATE products SET "sortOrder" = id;`);
  const sql = lines.join('\n');
  fs.writeFileSync(OUT_SQL, sql, 'utf8');
  console.log('SQL 已生成:', OUT_SQL, '共', PRODUCTS.length, '个新产品');
  // 执行
  const out = 'D:/阀门网站/scripts/_add_products_out.txt';
  execSync(`"${PSQL}" "${DB}" -t -f "${OUT_SQL}" -o "${out}"`, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024 });
  console.log(fs.readFileSync(out, 'utf8').slice(0, 2000));
  fs.unlinkSync(out);
  console.log('完成');
}

build().catch(e => { console.error(e); process.exit(1); });
