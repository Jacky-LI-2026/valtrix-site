/**
 * 单元验证脚本 —— 层级分区 / 能力事实常量 / 搜索匹配（只读，不写任何数据）
 * 运行：npx tsx scripts/_test_template_groups.js
 * 通过时打印 `PASS: n FAIL: 0`；失败以 exit code 1 反映。
 */
const { TEMPLATE_PRESETS, FULL_LAYOUT_SLUGS } = require('../lib/templates/presets.ts');
const groups = require('../lib/templates/template-groups.ts');
const {
  TIER_ORDER,
  TIER_LABEL,
  TIER_HINT,
  CUSTOM_NOTE,
  SKIN_NOTE,
  WIRED_NOTE,
  THEME_WIRED,
  STYLE_WIRED,
  tierOfPreset,
  matchesQuery,
} = groups;

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
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) ok(name + '  = ' + e);
  else bad(name, 'got ' + a + ', want ' + e);
}
function assert(name, cond, detail) {
  if (cond) ok(name);
  else bad(name, detail || 'assertion failed');
}

// 分类辅助（仅用被测函数，不自行实现分类逻辑）
function classify(fullLayoutSlugs) {
  const groups = { layout: [], skin: [], pack: [], custom: [] };
  for (const p of TEMPLATE_PRESETS) groups[tierOfPreset(p, fullLayoutSlugs)].push(p.slug);
  return groups;
}

console.log('\n== 1. TIER_ORDER / TIER_LABEL / TIER_HINT ==');
eq('TIER_ORDER', TIER_ORDER, ['layout', 'skin', 'pack', 'custom']);
for (const tier of ['layout', 'skin', 'pack', 'custom']) {
  assert('TIER_LABEL[' + tier + '] 非空', typeof TIER_LABEL[tier] === 'string' && TIER_LABEL[tier].length > 0, String(TIER_LABEL[tier]));
  assert('TIER_HINT[' + tier + '] 非空', typeof TIER_HINT[tier] === 'string' && TIER_HINT[tier].length > 0, String(TIER_HINT[tier]));
}
eq('TIER_HINT 键集合 = TIER_ORDER', Object.keys(TIER_HINT).sort(), [...TIER_ORDER].sort());

console.log('\n== 2. 用真实 TEMPLATE_PRESETS + FULL_LAYOUT_SLUGS 分类 ==');
eq('FULL_LAYOUT_SLUGS', FULL_LAYOUT_SLUGS, ['unilok-industrial', 'kitz-clean']);
const g = classify(FULL_LAYOUT_SLUGS);
eq('layout 分组（按原数组顺序）', g.layout, ['unilok-industrial', 'kitz-clean']);
eq('skin 分组', g.skin, [
  't1-tech-blue', 't2-industrial', 't3-carbon-black', 't4-medical', 't5-education',
  't6-ecommerce', 't7-finance', 't8-realestate', 't9-restaurant', 't10-creative',
]);
assert('skin 恰 10 条', g.skin.length === 10, 'got ' + g.skin.length);
assert('layout + skin = 12', g.layout.length + g.skin.length === 12, 'got ' + (g.layout.length + g.skin.length));
eq('总数 = TEMPLATE_PRESETS.length', g.layout.length + g.skin.length, TEMPLATE_PRESETS.length);
const allSlugs = TEMPLATE_PRESETS.map((p) => p.slug);
eq('并集 = 全集', [...g.layout, ...g.skin].slice().sort(), allSlugs.slice().sort());
const inter = g.layout.filter((s) => g.skin.includes(s));
eq('交集 = 空', inter, []);
assert('pack / custom 不由预设产生', g.pack.length === 0 && g.custom.length === 0, JSON.stringify([g.pack, g.custom]));

console.log('\n== 3. 能力事实常量（THEME_WIRED / STYLE_WIRED / 文案）==');
// 这一节替代了原来的 styleFeatureTags 测试。
// 2026-09-15 实测：style 的 8 个字段**没有一个真正影响前台**（.tpl-* 类全仓 0 使用；
// data-*-style 无 CSS 选择器也无 JS 读取方），所以把「功能标签」整体删除，
// 改为把这组**事实**固化成可被测试断言的常量，防止有人再写出"想当然"的 UI。

// 3.1 已删除的 API 不得复活（防止有人"顺手加回来"）
assert('styleFeatureTags 已彻底移除（不再是导出）', typeof groups.styleFeatureTags === 'undefined', 'typeof=' + typeof groups.styleFeatureTags);

// 3.2 theme 全部生效
const themeKeys = Object.keys(THEME_WIRED);
assert('THEME_WIRED 覆盖 theme 的 7 个字段', themeKeys.length === 7, JSON.stringify(themeKeys));
eq('THEME_WIRED 全部为 true', themeKeys.filter((k) => THEME_WIRED[k] !== true), []);

// 3.3 style 字段的接线状态（2026-09-15 同日已全部接线，含新增的 titleWeight）
const styleKeys = Object.keys(STYLE_WIRED);
eq(
  'STYLE_WIRED 覆盖的字段与真实数据一致（9 个 style 字段，含新增 titleWeight）',
  styleKeys.slice().sort(),
  ['card', 'cta', 'fontScale', 'header', 'hero', 'radius', 'shadow', 'spacing', 'titleWeight'].sort()
);
eq('STYLE_WIRED 全部为 true（2026-09-15 已接线，浏览器 A/B 实测确认）', styleKeys.filter((k) => STYLE_WIRED[k] !== true), []);

// 3.4 说明书文案必须与**当前接线状态**一致
// ⚠️ 2026-09-15 同日两度改写：先写「尚未接线」，接线完成后当天即改为「已生效」。
//    这里断言的是**当下的真话**；若将来又改回未接线，必须同步这里 —— 否则后台会对用户说假话。
for (const [name, text] of [['WIRED_NOTE', WIRED_NOTE], ['SKIN_NOTE', SKIN_NOTE], ['CUSTOM_NOTE', CUSTOM_NOTE]]) {
  assert(name + ' 非空', typeof text === 'string' && text.trim().length > 20, name);
}
assert('WIRED_NOTE 说明「已生效」而不是「未接线」', !WIRED_NOTE.includes('未接线') && WIRED_NOTE.includes('生效'), WIRED_NOTE.slice(0, 60));
assert('WIRED_NOTE 点明整站版式模板不套用皮肤参数', WIRED_NOTE.includes('整站版式模板'), WIRED_NOTE.slice(0, 80));
// 2026-09-15：配色与版式已解耦 —— 「只应用配色」不再切走当前模板，
// 故这条断言按**新语义**改写（仍保留 '切' / '颜色' 两个关键词，另加新语义关键词）。
assert(
  'SKIN_NOTE 说明「只应用配色不切换模板 / 想换版式用『切换为此模板』」',
  SKIN_NOTE.includes('切') && SKIN_NOTE.includes('颜色') && SKIN_NOTE.includes('只应用配色') && SKIN_NOTE.includes('不会'),
  SKIN_NOTE.slice(0, 60)
);
assert(
  'SKIN_NOTE 不再声称「应用会把当前模板切走」（旧文案回归哨兵）',
  !SKIN_NOTE.includes('会被切走') && !SKIN_NOTE.includes('需要再点一次'),
  SKIN_NOTE.slice(0, 60)
);
assert('CUSTOM_NOTE 说明「不影响前台」', CUSTOM_NOTE.includes('不影响前台'), CUSTOM_NOTE.slice(0, 40));

// 3.5 层级说明文案必须与当前接线状态一致
assert('TIER_HINT.skin 已不说「未接线」', !TIER_HINT.skin.includes('未接线'), TIER_HINT.skin);
assert('TIER_HINT.skin 讲清了它改什么', TIER_HINT.skin.includes('配色') && TIER_HINT.skin.includes('圆角'), TIER_HINT.skin);
assert('TIER_HINT.custom 明确写了「不参与前台渲染」', TIER_HINT.custom.includes('不参与前台渲染'), TIER_HINT.custom);

console.log('\n== 4. matchesQuery ==');
assert('空串 → true', matchesQuery(TEMPLATE_PRESETS[0], '') === true);
assert('纯空白 → true', matchesQuery(TEMPLATE_PRESETS[0], '   \t ') === true);
const t3 = TEMPLATE_PRESETS.find((p) => p.slug === 't3-carbon-black');
assert('"carbon" 命中 t3-carbon-black', matchesQuery(t3, 'carbon') === true);
assert('"CARBON" 大小写不敏感', matchesQuery(t3, 'CARBON') === true);
assert('"炭黑" 命中 t3（name 中文）', matchesQuery(t3, '炭黑') === true);
assert('"carbon" 不命中 t1', matchesQuery(TEMPLATE_PRESETS[0], 'carbon') === false);
assert('descriptionEn 可被搜到（英文描述关键词）', matchesQuery(t3, 'carbon black + silver gray') === true);
const themeHits = TEMPLATE_PRESETS.filter((p) => matchesQuery(p, '#C0C0C0'));
eq('theme 对象内容不应被搜到（"#C0C0C0" 命中 0 条）', themeHits.map((p) => p.slug), []);
assert('null 字段不抛错', matchesQuery({ name: null, slug: undefined, theme: { a: 1 } }, 'x') === false);
assert('undefined 字段 + 空 query 不抛错', matchesQuery({ a: undefined }, '') === true);
assert('嵌套对象不产生 [object Object] 命中', matchesQuery({ name: 'abc', theme: { primary: '#123456' } }, 'object') === false);
assert('null/undefined 整体不抛错', matchesQuery(null, 'x') === false && matchesQuery(undefined, '') === true);
assert('非字符串字段（数字/布尔）不参与匹配', matchesQuery({ n: 123, b: true }, '123') === false);
// extra 参数：调用方显式补充的搜索面（行业包用它把嵌套 seo.title 摊平）
assert('extra 命中时返回 true', matchesQuery({ name: 'x' }, '金刚石', ['金刚石新材料行业包']) === true);
assert('extra 为空数组不影响原有行为', matchesQuery({ name: 'x' }, '金刚石', []) === false);
assert('extra 里的非字符串被安全忽略', matchesQuery({ name: 'x' }, 'q', [null, undefined, 123]) === false);

console.log('\n== 5. 负向对照：白名单换成 [] ==');
const g0 = classify([]);
assert('layout 变 0 条', g0.layout.length === 0, JSON.stringify(g0.layout));
assert('skin 变 12 条', g0.skin.length === 12, 'got ' + g0.skin.length);
eq('skin([]) = 全集', g0.skin.slice().sort(), allSlugs.slice().sort());

console.log('\nPASS: ' + pass + ' FAIL: ' + fail);
if (fail > 0) {
  console.log('\n失败明细：');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fail === 0 ? 0 : 1);
