#!/usr/bin/env node
/**
 * export-pack —— 从现有站点导出内容为行业包 seed JSON
 * 用法：node scripts/export-pack.js --db "<DATABASE_URL>" --out industry-packs/<key>/seed --key <key>
 * 更新日期：2026-09-08
 */
const fs = require('fs');
const path = require('path');

// 加载 .env
(function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    }
  } catch (e) { /* ignore */ }
})();

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--db') opt.db = args[++i];
  else if (args[i] === '--out') opt.out = args[++i];
  else if (args[i] === '--key') opt.key = args[++i];
}
if (!opt.db || !opt.out) { console.error('用法: node scripts/export-pack.js --db "<DATABASE_URL>" --out <seed目录> [--key <key>]'); process.exit(1); }
if (!opt.key) opt.key = path.basename(path.dirname(opt.out));
// 关键：--db 必须实际生效（PrismaClient 读 process.env.DATABASE_URL）
process.env.DATABASE_URL = opt.db;

const { PrismaClient } = require('../lib/generated/prisma');

const MODELS = [
  'language', 'themeConfig', 'seoConfig', 'menu',
  'productTab', 'productCategory', 'product', 'productSpec', 'shopProduct',
  'newsCategory', 'news', 'resourceCategory', 'resourceItem',
  'industry', 'aboutSection', 'job', 'service', 'case', 'faq', 'homeConfig'
];
const SKIP = ['createdAt', 'updatedAt', 'siteId', 'tenantId']; // 保留 id 作为引用锚点

function replacer(k, v) {
  if (typeof v === 'bigint') return String(v);
  if (v instanceof Date) return v.toISOString();
  return v;
}

(async () => {
  const prisma = new PrismaClient();
  const clientMap = {
    language: 'language', themeConfig: 'themeConfig', seoConfig: 'sEOConfig', menu: 'menu',
    productTab: 'productTab', productCategory: 'productCategory', product: 'product', productSpec: 'productSpec',
    shopProduct: 'shopProduct', newsCategory: 'newsCategory', news: 'news', resourceCategory: 'resourceCategory',
    resourceItem: 'resourceItem', industry: 'industry', aboutSection: 'aboutSection', job: 'job',
    service: 'service', case: 'case', faq: 'faq', homeConfig: 'homeConfig'
  };
  fs.mkdirSync(opt.out, { recursive: true });
  const summary = {};
  try {
    for (const model of MODELS) {
      const client = prisma[clientMap[model]];
      if (!client || typeof client.findMany !== 'function') { console.log(`- ${model}: 跳过（无 client）`); continue; }
      const rows = await client.findMany();
      const clean = rows.map(r => {
        const o = {};
        for (const k of Object.keys(r)) {
          if (SKIP.includes(k)) continue;
          o[k] = r[k];
        }
        return o;
      });
      const file = path.join(opt.out, model + '.json');
      fs.writeFileSync(file, JSON.stringify({ model, rows: clean }, replacer, 2), 'utf8');
      summary[model] = clean.length;
      console.log(`- ${model}: ${clean.length} 条 → ${path.relative(process.cwd(), file)}`);
    }
    // 生成 pack.json 骨架
    const packPath = path.join(path.dirname(opt.out), 'pack.json');
    if (!fs.existsSync(packPath)) {
      const pack = {
        key: opt.key,
        name: opt.key,
        nameEn: opt.key,
        version: '1.0.0',
        category: 'general',
        description: '由 export-pack 从现有站点导出（' + new Date().toISOString().slice(0, 10) + '）',
        requiresPlugins: [],
        optionalPlugins: [],
        languages: { default: 'zh', enabled: ['zh', 'en', 'ja', 'ko', 'fr', 'ar'] },
        designTokens: { primary: '#CC0000', accent: '#0B3D91', fontFamily: 'Roboto, PingFang SC, Segoe UI, Arial, sans-serif' },
        seedData: Object.keys(summary).map(m => ({ model: m, file: 'seed/' + m + '.json' })),
        assets: []
      };
      fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf8');
      console.log('ℹ️ pack.json 骨架已生成（请完善 name/requiresPlugins/designTokens 后使用）: ' + packPath);
    }
    console.log('✅ 导出完成，共 ' + Object.values(summary).reduce((a, b) => a + b, 0) + ' 条');
  } finally {
    await prisma.$disconnect();
  }
})();
