#!/usr/bin/env node
/**
 * pack-cli —— 行业包（Industry Pack）命令行工具
 * 子命令：
 *   validate <packDir>                 校验包结构/依赖/JSON 合法性
 *   install  <packDir> --site <id> [--force]   安装到指定站点
 *   uninstall <packKey> --site <id>   卸载指定站点行业包数据
 *   upgrade  <packDir> --site <id>    版本 diff 升级（v1=版本变更时覆盖重装 seed）
 *   list                               列出本地行业包
 * 更新日期：2026-09-08
 */
const fs = require('fs');
const path = require('path');

// ---- 加载 .env（node 脚本环境无 Next 自动加载）----
(function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const txt = fs.readFileSync(envPath, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    }
  } catch (e) { /* ignore */ }
})();

const { PrismaClient } = require('../lib/generated/prisma');

// ---- 模型顺序（先父后子）与引用映射 ----
const MODEL_ORDER = [
  'language', 'themeConfig', 'seoConfig', 'menu',
  'productTab', 'productCategory', 'product', 'productSpec', 'shopProduct',
  'newsCategory', 'news', 'resourceCategory', 'resourceItem',
  'industry', 'aboutSection', 'job', 'service', 'case', 'faq',
  'homeConfig'
];
// child 引用字段 → 父 model（安装时用 idMap 转换）
const REF_MAP = {
  productCategory: { tabId: 'productTab' },
  product:      { tabId: 'productTab', categoryId: 'productCategory' },
  productSpec:  { productId: 'product' },
  shopProduct:  { productId: 'product' },
  news:         { categoryId: 'newsCategory' },
  resourceItem: { categoryId: 'resourceCategory' },
  menu:         { parentId: 'menu' },
};
// 数组引用（Json 字段里的 id 数组）
const ARRAY_REF = {
  homeConfig: { featuredProducts: 'product', featuredCategories: 'productCategory' },
};
// 系统字段（导出时剔除，导入时忽略）
const SKIP_FIELDS = ['id', 'createdAt', 'updatedAt', 'siteId', 'tenantId'];
// 唯一键去重字段（slug/model/code/type）——全局已有同键行则复用，不重复导入
const UNIQ_FIELDS = ['slug', 'model', 'code', 'type'];

function modelClient(prisma, model) {
  const c = { language: 'language', themeConfig: 'themeConfig', seoConfig: 'sEOConfig', menu: 'menu',
    productTab: 'productTab', productCategory: 'productCategory', product: 'product', productSpec: 'productSpec',
    shopProduct: 'shopProduct', newsCategory: 'newsCategory', news: 'news', resourceCategory: 'resourceCategory',
    resourceItem: 'resourceItem', industry: 'industry', aboutSection: 'aboutSection', job: 'job',
    service: 'service', case: 'case', faq: 'faq', homeConfig: 'homeConfig' }[model];
  return prisma[c];
}

function readPack(packDir) {
  const pj = path.join(packDir, 'pack.json');
  if (!fs.existsSync(pj)) throw new Error('pack.json 不存在: ' + pj);
  const pack = JSON.parse(fs.readFileSync(pj, 'utf8'));
  return pack;
}

function validate(packDir, pack) {
  const errs = [];
  if (!pack.key) errs.push('缺少 key');
  if (!pack.version) errs.push('缺少 version');
  if (!Array.isArray(pack.requiresPlugins)) errs.push('requiresPlugins 必须是数组');
  if (!pack.languages || !pack.languages.default) errs.push('languages.default 必填');
  if (!Array.isArray(pack.seedData) || pack.seedData.length === 0) errs.push('seedData 必填且非空');
  for (const sd of pack.seedData || []) {
    const f = path.join(packDir, sd.file);
    if (!fs.existsSync(f)) { errs.push('seed 文件缺失: ' + sd.file); continue; }
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!Array.isArray(j.rows)) errs.push(sd.file + ' 需为 {rows:[...]} 结构');
      if (!MODEL_ORDER.includes(sd.model)) errs.push('未知 model: ' + sd.model);
    } catch (e) { errs.push(sd.file + ' JSON 解析失败: ' + e.message); }
  }
  // 插件依赖校验（对照内置插件注册表）
  try {
    const { BUILTIN_PLUGINS } = require('../lib/plugins/registry');
    const known = new Set((BUILTIN_PLUGINS || []).map(p => p.key));
    for (const rp of pack.requiresPlugins || []) if (!known.has(rp)) errs.push('requiresPlugins 未注册: ' + rp);
  } catch (e) { /* registry 依赖 Next 环境时忽略 */ }
  return errs;
}

async function doInstall(packDir, siteId, force) {
  const pack = readPack(packDir);
  const errs = validate(packDir, pack);
  if (errs.length) { console.error('❌ 校验失败：\n - ' + errs.join('\n - ')); process.exit(1); }

  const prisma = new PrismaClient();
  try {
    const site = await prisma.site.findUnique({ where: { id: BigInt(siteId) } });
    if (!site) throw new Error('站点不存在: ' + siteId);

    const existed = await prisma.industryPackRecord.findFirst({
      where: { siteId: BigInt(siteId), packKey: pack.key, action: 'install' },
    });
    if (existed && !force) {
      console.error(`❌ 站点 ${siteId} 已安装 ${pack.key}（version ${existed.packVersion}）。需 --force 覆盖或先 uninstall。`);
      process.exit(1);
    }

    const idMap = {}; // { model: { oldId: newId } }
    const report = { installed: {}, skipped: [], failed: [] };

    // 读取全部 seed
    const seeds = {};
    for (const sd of pack.seedData) seeds[sd.model] = JSON.parse(fs.readFileSync(path.join(packDir, sd.file), 'utf8'));

    // 按顺序导入
    for (const model of MODEL_ORDER) {
      const data = seeds[model];
      if (!data || !data.rows || data.rows.length === 0) { report.installed[model] = 0; continue; }
      const client = modelClient(prisma, model);
      const refs = REF_MAP[model] || {};
      const arrRefs = ARRAY_REF[model] || {};
      let n = 0;
      for (const raw of data.rows) {
        try {
          const row = {};
          for (const k of Object.keys(raw)) {
            if (SKIP_FIELDS.includes(k)) continue;
            let v = raw[k];
            // 标量引用转换
            if (refs[k] && v != null && v !== '') {
              const mapped = idMap[refs[k]] && idMap[refs[k]][String(v)];
              if (mapped != null) v = mapped; else if (force && existed) v = null; // 找不到父→置空（覆盖模式）
            }
            // 数组引用转换
            if (arrRefs[k] && Array.isArray(v)) {
              const pModel = arrRefs[k];
              v = v.map(x => {
                const m = idMap[pModel] && idMap[pModel][String(x)];
                return m != null ? m : x;
              });
            }
            row[k] = v;
          }
          row.siteId = BigInt(siteId);
          // 唯一键去重：全局（或任意站点）已有同 slug/model/code 的行 → 复用其 id，不重复导入
          const uniqKey = uniqueKeyFor(model, row);
          let target = null;
          if (uniqKey) target = await client.findFirst({ where: uniqKey });
          if (target) {
            if (!idMap[model]) idMap[model] = {};
            idMap[model][String(raw.id)] = String(target.id);
            report.skipped.push(`${model}#${raw.id}（${uniqKey[Object.keys(uniqKey)[0]]} 已存在，复用 id=${String(target.id)}）`);
            continue;
          }
          let created;
          try {
            created = await client.create({ data: row });
          } catch (e) {
            // 通用兜底：P2002 唯一约束冲突 → 按 slug/model/code 复用既有行
            if (e && e.code === 'P2002') {
              const q = {};
              for (const f of UNIQ_FIELDS) if (row[f] != null && row[f] !== '') q[f] = row[f];
              if (Object.keys(q).length) {
                const existing = await client.findFirst({ where: q });
                if (existing) {
                  if (!idMap[model]) idMap[model] = {};
                  idMap[model][String(raw.id)] = String(existing.id);
                  report.skipped.push(`${model}#${raw.id}（唯一键 ${Object.keys(q)[0]} 已存在，复用 id=${String(existing.id)}）`);
                  continue;
                }
              }
            }
            throw e;
          }
          if (!idMap[model]) idMap[model] = {};
          idMap[model][String(raw.id)] = String(created.id);
          n++;
        } catch (e) {
          report.failed.push(`${model}#${raw.id}: ${e.message}`);
        }
      }
      report.installed[model] = n;
    }

    // 更新站点记录
    await prisma.site.update({
      where: { id: BigInt(siteId) },
      data: { industryPack: pack.key, industryPackVersion: pack.version },
    });
    // 安装历史
    await prisma.industryPackRecord.create({
      data: { siteId: BigInt(siteId), packKey: pack.key, packVersion: pack.version, action: 'install', result: report },
    });

    console.log(`✅ 安装完成：${pack.key}@${pack.version} → site ${siteId}`);
    for (const [m, c] of Object.entries(report.installed)) console.log(`   ${m}: ${c} 条`);
    if (report.failed.length) { console.log('⚠️ 失败 ' + report.failed.length + ' 条：'); report.failed.slice(0, 10).forEach(f => console.log('   - ' + f)); }
  } finally {
    await prisma.$disconnect();
  }
}

function uniqueKeyFor(model, row) {
  if (model === 'language' && row.code) return { code: row.code };
  if (model === 'product' && row.model) return { model: row.model };
  if (model === 'shopProduct' && row.slug) return { slug: row.slug };
  if ((model === 'productTab' || model === 'productCategory' || model === 'newsCategory' || model === 'resourceCategory') && row.slug) return { slug: row.slug };
  if ((model === 'industry' || model === 'news' || model === 'resourceItem') && row.slug) return { slug: row.slug };
  return null;
}

async function doUninstall(packKey, siteId) {
  const prisma = new PrismaClient();
  try {
    const rec = await prisma.industryPackRecord.findFirst({
      where: { siteId: BigInt(siteId), packKey, action: 'install' },
      orderBy: { id: 'desc' },
    });
    if (!rec) { console.error('❌ 未找到安装记录：' + packKey + ' @ site ' + siteId); process.exit(1); }
    // 倒序删除（子先删）
    const deleted = {};
    for (let i = MODEL_ORDER.length - 1; i >= 0; i--) {
      const model = MODEL_ORDER[i];
      const client = modelClient(prisma, model);
      if (!client || !client.deleteMany) continue;
      const r = await client.deleteMany({ where: { siteId: BigInt(siteId) } });
      deleted[model] = r.count;
    }
    await prisma.industryPackRecord.create({
      data: { siteId: BigInt(siteId), packKey, packVersion: rec.packVersion, action: 'uninstall', result: deleted },
    });
    console.log(`✅ 卸载完成：${packKey} @ site ${siteId}`);
    for (const [m, c] of Object.entries(deleted)) if (c > 0) console.log(`   ${m}: 删除 ${c} 条`);
  } finally {
    await prisma.$disconnect();
  }
}

async function doUpgrade(packDir, siteId) {
  const pack = readPack(packDir);
  const prisma = new PrismaClient();
  try {
    const site = await prisma.site.findUnique({ where: { id: BigInt(siteId) } });
    if (!site || site.industryPack !== pack.key) {
      console.error(`❌ 站点 ${siteId} 未安装 ${pack.key}，先 install。`);
      process.exit(1);
    }
    const rec = await prisma.industryPackRecord.findFirst({
      where: { siteId: BigInt(siteId), packKey: pack.key, action: 'install' },
      orderBy: { id: 'desc' },
    });
    if (rec && rec.packVersion === pack.version) {
      console.log('ℹ️ 版本相同（' + pack.version + '），无升级动作。如需强制重装：install --force');
      return;
    }
    console.log(`⬆️ 升级 ${rec ? rec.packVersion : '?'} → ${pack.version}（覆盖式重装 seed）`);
    await doInstall(packDir, siteId, true);
  } finally {
    await prisma.$disconnect();
  }
}

function listLocal() {
  const root = path.join(process.cwd(), 'industry-packs');
  if (!fs.existsSync(root)) { console.log('industry-packs/ 目录不存在'); return; }
  for (const d of fs.readdirSync(root)) {
    const pj = path.join(root, d, 'pack.json');
    if (fs.existsSync(pj)) {
      try {
        const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
        const errs = validate(path.join(root, d), p);
        console.log(`- ${p.key}@${p.version}  ${p.name}  [${errs.length ? '⚠️ ' + errs.join('; ') : '✅ 合法'}]`);
      } catch (e) { console.log(`- ${d}: pack.json 读取失败 ${e.message}`); }
    }
  }
}

// ---- 主入口 ----
(async () => {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);
  const opt = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--site') opt.site = rest[++i];
    else if (rest[i] === '--force') opt.force = true;
    else positional.push(rest[i]);
  }
  // 位置参数语义：validate/install/upgrade=packDir；uninstall=packKey
  if (cmd === 'uninstall') { opt.packKey = positional[0]; }
  else { opt.packDir = positional[0]; opt.packKey = positional[1]; }
  try {
    if (cmd === 'validate') {
      if (!opt.packDir) throw new Error('用法: pack-cli validate <packDir>');
      const pack = readPack(path.resolve(opt.packDir));
      const errs = validate(path.resolve(opt.packDir), pack);
      if (errs.length) { console.error('❌ 校验失败：\n - ' + errs.join('\n - ')); process.exit(1); }
      console.log(`✅ ${pack.key}@${pack.version} 校验通过（seed ${pack.seedData.length} 项，依赖插件 ${pack.requiresPlugins.length} 个）`);
    } else if (cmd === 'install') {
      if (!opt.packDir || !opt.site) throw new Error('用法: pack-cli install <packDir> --site <id> [--force]');
      await doInstall(path.resolve(opt.packDir), opt.site, !!opt.force);
    } else if (cmd === 'uninstall') {
      if (!opt.packKey || !opt.site) throw new Error('用法: pack-cli uninstall <packKey> --site <id>');
      await doUninstall(opt.packKey, opt.site);
    } else if (cmd === 'upgrade') {
      if (!opt.packDir || !opt.site) throw new Error('用法: pack-cli upgrade <packDir> --site <id>');
      await doUpgrade(path.resolve(opt.packDir), opt.site);
    } else if (cmd === 'list') {
      listLocal();
    } else {
      console.log(`用法:
  pack-cli validate <packDir>
  pack-cli install <packDir> --site <id> [--force]
  pack-cli uninstall <packKey> --site <id>
  pack-cli upgrade <packDir> --site <id>
  pack-cli list`);
    }
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
})();
