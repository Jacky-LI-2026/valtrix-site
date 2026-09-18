/**
 * 代码级断言 —— 「只应用配色」(applyColors) 与「应用模板」(applyPreset) 的边界
 * =====================================================================
 * 目的：把「解耦配色与版式」这条规则钉死，防止日后有人"顺手"把 templateSlug 加回
 *       applyColors 分支（那会让配色皮肤又把整站版式踢回默认）。
 *
 * 只读：只读源码文本 + 纯函数，**不连数据库、不发请求、不写任何文件**。
 * 运行：npx tsx scripts/_test_apply_colors.js
 * 通过时打印 `PASS: n FAIL: 0`；失败以 exit code 1 反映。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTE = path.join(ROOT, 'app/api/admin/templates/route.ts');
const PAGE = path.join(ROOT, 'app/admin/templates/page.tsx');
const SCHEMA = path.join(ROOT, 'prisma/schema.prisma');

const { presetToThemeConfig, TEMPLATE_PRESETS } = require('../lib/templates/presets.ts');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name) {
  pass += 1;
  console.log('  PASS ' + name);
}
function bad(name, detail) {
  fail += 1;
  failures.push(name + ' — ' + detail);
  console.log('  FAIL ' + name + ' — ' + detail);
}
function assert(name, cond, detail) {
  if (cond) ok(name);
  else bad(name, detail || 'assertion failed');
}
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) ok(name + '  = ' + e);
  else bad(name, 'got ' + a + ', want ' + e);
}

/**
 * 从源码里按大括号配对抽出一个 `action === "xxx"` 分支的完整文本。
 * （不用行号切片：行号一改测试就漂；大括号配对对 `${...}` 模板串也安全 —— 两侧成对。）
 */
function extractActionBranch(src, action) {
  const marker = '"' + action + '") {';
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const open = at + marker.length - 1; // 指向 '{'
  let depth = 0;
  for (let k = open; k < src.length; k += 1) {
    const ch = src[k];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, k + 1);
    }
  }
  return null;
}

const routeSrc = fs.readFileSync(ROUTE, 'utf8');
const pageSrc = fs.readFileSync(PAGE, 'utf8');

console.log('\n== 1. route.ts：applyColors 分支存在且不含模板切换 ==');
const colorsBranch = extractActionBranch(routeSrc, 'applyColors');
const presetBranch = extractActionBranch(routeSrc, 'applyPreset');

assert('applyColors 分支存在', typeof colorsBranch === 'string' && colorsBranch.length > 0, '未找到 action==="applyColors" 分支');
assert('applyPreset 分支存在（既有行为）', typeof presetBranch === 'string' && presetBranch.length > 0, '未找到 action==="applyPreset" 分支');

if (colorsBranch) {
  // ① 核心断言：applyColors 里**不出现** templateSlug（赋值更不允许）
  assert(
    'applyColors 分支不含 templateSlug（正则 /templateSlug\\s*[:=]/）',
    !/templateSlug\s*[:=]/.test(colorsBranch),
    '命中：' + (colorsBranch.match(/.*templateSlug.*/g) || []).join(' | ')
  );
  assert(
    'applyColors 分支完全不出现 templateSlug 这个标识符',
    !colorsBranch.includes('templateSlug'),
    '命中：' + (colorsBranch.match(/.*templateSlug.*/g) || []).join(' | ')
  );
  // ② 不动 templates 表 / Site
  assert('applyColors 分支不写 templates 表', !/prisma\.template\b/.test(colorsBranch), (colorsBranch.match(/.*prisma\.template.*/g) || []).join(' | '));
  assert('applyColors 分支不写 Site', !/prisma\.site\b/.test(colorsBranch), (colorsBranch.match(/.*prisma\.site.*/g) || []).join(' | '));
  // ③ 只写 ThemeConfig
  assert('applyColors 分支写 ThemeConfig', /prisma\.themeConfig\.(update|create)/.test(colorsBranch), colorsBranch.slice(0, 80));
  // ④ 必须复用映射函数，禁止手抄字段列表
  assert('applyColors 分支复用 presetToThemeConfig()（禁止手抄字段）', colorsBranch.includes('presetToThemeConfig(preset)'), colorsBranch.slice(0, 120));
  // ⑤ 语义细节：remark 说明「未切换模板」；未知 slug 仍 400
  assert('applyColors 的 remark 点明「未切换模板」', colorsBranch.includes('未切换模板'), colorsBranch.slice(0, 200));
  assert('applyColors 未知 slug 仍返回 400「预设模板不存在」', /预设模板不存在/.test(colorsBranch) && /status:\s*400/.test(colorsBranch), '未找到 400 分支');
  assert('applyColors 返回体含 mode: "colors"', /mode:\s*"colors"/.test(colorsBranch), colorsBranch.slice(-160));
}

console.log('\n== 2. route.ts：applyPreset 分支仍写 templateSlug（既有行为未被误改）==');
if (presetBranch) {
  assert('applyPreset 分支仍写 templateSlug', /templateSlug\s*:/.test(presetBranch), '未找到 templateSlug 赋值');
  assert('applyPreset 分支仍 upsert templates 表', /prisma\.template\./.test(presetBranch), '未找到 prisma.template 调用');
  assert('applyPreset 分支仍写默认站点 Site.templateSlug', /prisma\.site\.update/.test(presetBranch), '未找到 prisma.site.update');
}
assert('route.ts 的 401 鉴权块未被改动（仍为 auth() + 未授权）', /const session = await auth\(\);/.test(routeSrc) && /error: "未授权"/.test(routeSrc) && /status: 401/.test(routeSrc), '未找到 401 鉴权块');

console.log('\n== 3. presetToThemeConfig 的键 == ThemeConfig 的颜色/字体字段 ==');
const EXPECTED = ['accent', 'dark', 'darkLight', 'fontFamily', 'primary', 'primaryDark', 'primaryLight'];
const mapped = presetToThemeConfig(TEMPLATE_PRESETS[0]);
eq('presetToThemeConfig 键集合 = 7 个颜色/字体字段', Object.keys(mapped).sort(), EXPECTED);
eq('映射值全部非空（取第一套预设）', EXPECTED.filter((k) => !mapped[k]), []);

const schemaSrc = fs.readFileSync(SCHEMA, 'utf8');
const modelMatch = schemaSrc.match(/model ThemeConfig \{([\s\S]*?)\n\}/);
assert('schema.prisma 里能找到 model ThemeConfig', !!modelMatch, '未匹配到 model ThemeConfig');
if (modelMatch) {
  const fields = modelMatch[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('@@') && !l.startsWith('//'))
    .map((l) => l.split(/\s+/)[0]);
  eq(
    'presetToThemeConfig 的 7 个键在 ThemeConfig 里都存在（列名一一对应）',
    EXPECTED.filter((k) => !fields.includes(k)),
    []
  );
  assert('ThemeConfig 仍有 remark 列（applyColors 要写它）', fields.includes('remark'), JSON.stringify(fields));
  assert(
    'presetToThemeConfig 不返回 preset.theme 之外的列（templateSlug 不在其中）',
    !Object.keys(mapped).includes('templateSlug'),
    JSON.stringify(Object.keys(mapped))
  );
}

console.log('\n== 4. page.tsx：配色皮肤卡给两个动作 ==');
assert('新增 applyColors 回调', /const applyColors = async \(slug: string\)/.test(pageSrc), '未找到 applyColors 定义');
assert('applyColors 打到 ?action=applyColors', /\/api\/admin\/templates\?action=applyColors/.test(pageSrc), '未找到 fetch 调用');
assert('applyPreset 回调仍保留（?action=applyPreset）', /\/api\/admin\/templates\?action=applyPreset/.test(pageSrc), '未找到 applyPreset fetch');
assert('配色皮肤主按钮文案 = 「只应用配色」', pageSrc.includes('只应用配色'), '未找到按钮文案');
assert('配色皮肤次按钮文案 = 「切换为此模板」', pageSrc.includes('切换为此模板'), '未找到按钮文案');
assert(
  '卡片按层级分流（tierOfPreset(p, fullLayoutSlugs) === \'skin\'）',
  /tierOfPreset\(p, fullLayoutSlugs\) === 'skin'/.test(pageSrc),
  '未找到层级判断'
);
assert('confirm 文案说清「不会切换当前模板」', /不会切换当前模板/.test(pageSrc), '未找到 confirm 文案');
assert('未破坏 SVG 缩略图 / 预览 / 存为我的模板 / 当前应用徽章', pageSrc.includes('存为我的模板') && pageSrc.includes('当前应用') && /viewBox="0 0 200 84"/.test(pageSrc) && pageSrc.includes('?__template='), '有元素缺失');

console.log('\n== 5. 负向对照：断言本身能失败（哨兵自检）==');
// 把一段"违规代码"喂给同一条规则，必须命中 —— 否则这条断言是假阳性哨兵。
const violating = 'if (req.nextUrl.searchParams.get("action") === "applyColors") { const d = { primary: "#fff", templateSlug: preset.slug }; }';
const vBranch = extractActionBranch(violating, 'applyColors');
assert('抽取器能取出合成的违规分支', typeof vBranch === 'string' && vBranch.includes('templateSlug'), String(vBranch));
assert('违规分支会被 /templateSlug\\s*[:=]/ 命中（证明断言会失败）', /templateSlug\s*[:=]/.test(vBranch), '正则未命中');
assert('违规分支会被「含 templateSlug 标识符」命中', vBranch.includes('templateSlug'), '未命中');
const clean = extractActionBranch('if (req.nextUrl.searchParams.get("action") === "applyColors") { const d = { primary: "#fff" }; }', 'applyColors');
assert('合规分支不被误判', !/templateSlug\s*[:=]/.test(clean) && !clean.includes('templateSlug'), String(clean));

console.log('\nPASS: ' + pass + ' FAIL: ' + fail);
if (fail > 0) {
  console.log('\n失败明细：');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fail === 0 ? 0 : 1);
