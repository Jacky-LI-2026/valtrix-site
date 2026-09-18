/**
 * pack-manager —— 行业包管理（服务器端）
 * 供 app/api/admin/industry-packs API 调用；pack-cli.js 为 CLI 入口。
 * 更新日期：2026-09-08
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@/lib/generated/prisma';

const PACKS_ROOT = path.join(process.cwd(), 'industry-packs');

// 模型顺序（先父后子）与引用映射（与 pack-cli.js 保持一致）
const MODEL_ORDER = [
  'language', 'themeConfig', 'seoConfig', 'menu',
  'productTab', 'productCategory', 'product', 'productSpec', 'shopProduct',
  'newsCategory', 'news', 'resourceCategory', 'resourceItem',
  'industry', 'aboutSection', 'job', 'service', 'case', 'faq',
  'homeConfig'
];
const REF_MAP: Record<string, Record<string, string>> = {
  productCategory: { tabId: 'productTab' },
  product: { tabId: 'productTab', categoryId: 'productCategory' },
  productSpec: { productId: 'product' },
  shopProduct: { productId: 'product' },
  news: { categoryId: 'newsCategory' },
  resourceItem: { categoryId: 'resourceCategory' },
  menu: { parentId: 'menu' },
};
const ARRAY_REF: Record<string, Record<string, string>> = {
  homeConfig: { featuredProducts: 'product', featuredCategories: 'productCategory' },
};
const SKIP_FIELDS = ['id', 'createdAt', 'updatedAt', 'siteId', 'tenantId'];
const UNIQ_FIELDS = ['slug', 'model', 'code', 'type'];

const CLIENT_MAP: Record<string, string> = {
  language: 'language', themeConfig: 'themeConfig', seoConfig: 'sEOConfig', menu: 'menu',
  productTab: 'productTab', productCategory: 'productCategory', product: 'product', productSpec: 'productSpec',
  shopProduct: 'shopProduct', newsCategory: 'newsCategory', news: 'news', resourceCategory: 'resourceCategory',
  resourceItem: 'resourceItem', industry: 'industry', aboutSection: 'aboutSection', job: 'job',
  service: 'service', case: 'case', faq: 'faq', homeConfig: 'homeConfig',
};

export interface PackMeta {
  key: string; name: string; nameEn: string; version: string; category: string;
  description: string; requiresPlugins: string[]; optionalPlugins: string[];
  languages: { default: string; enabled: string[] };
  designTokens: Record<string, string>;
  seedData: { model: string; file: string }[];
  assets: string[];
  uiPreset?: string;
}

export interface PackInfo {
  key: string; version: string; name: string; nameEn: string; category: string;
  description: string; valid: boolean; errors: string[]; seedCount: number; dir: string;
}

export function listLocalPacks(): PackInfo[] {
  const out: PackInfo[] = [];
  if (!fs.existsSync(PACKS_ROOT)) return out;
  for (const d of fs.readdirSync(PACKS_ROOT)) {
    const dir = path.join(PACKS_ROOT, d);
    const pj = path.join(dir, 'pack.json');
    if (!fs.existsSync(pj)) continue;
    try {
      const pack: PackMeta = JSON.parse(fs.readFileSync(pj, 'utf8'));
      const errs = validatePack(dir, pack);
      out.push({
        key: pack.key, version: pack.version, name: pack.name, nameEn: pack.nameEn,
        category: pack.category, description: pack.description, valid: errs.length === 0,
        errors: errs, seedCount: (pack.seedData || []).length, dir,
      });
    } catch (e) {
      out.push({ key: d, version: '?', name: d, nameEn: d, category: '?', description: '',
        valid: false, errors: ['pack.json 解析失败: ' + (e as Error).message], seedCount: 0, dir });
    }
  }
  return out;
}

export function validatePack(packDir: string, pack: PackMeta): string[] {
  const errs: string[] = [];
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
    } catch (e) { errs.push(sd.file + ' JSON 解析失败: ' + (e as Error).message); }
  }
  return errs;
}

function modelClient(prisma: PrismaClient, model: string): any {
  return (prisma as any)[CLIENT_MAP[model]];
}

function uniqueKeyFor(model: string, row: Record<string, any>): Record<string, any> | null {
  if (model === 'language' && row.code) return { code: row.code };
  if (model === 'product' && row.model) return { model: row.model };
  if (model === 'shopProduct' && row.slug) return { slug: row.slug };
  if ((model === 'productTab' || model === 'productCategory' || model === 'newsCategory' || model === 'resourceCategory') && row.slug) return { slug: row.slug };
  if ((model === 'industry' || model === 'news' || model === 'resourceItem') && row.slug) return { slug: row.slug };
  return null;
}

export async function installPack(packDir: string, siteId: bigint, force = false) {
  const pack: PackMeta = JSON.parse(fs.readFileSync(path.join(packDir, 'pack.json'), 'utf8'));
  const errs = validatePack(packDir, pack);
  if (errs.length) throw new Error('校验失败：\n - ' + errs.join('\n - '));

  const prisma = new PrismaClient();
  try {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new Error('站点不存在: ' + String(siteId));

    const existed = await prisma.industryPackRecord.findFirst({
      where: { siteId, packKey: pack.key, action: 'install' },
    });
    if (existed && !force) {
      throw new Error(`站点 ${String(siteId)} 已安装 ${pack.key}（version ${existed.packVersion}）。需 --force 覆盖或先卸载。`);
    }

    const idMap: Record<string, Record<string, string>> = {};
    const report: Record<string, any> = { installed: {}, skipped: [], failed: [] };
    const seeds: Record<string, { rows: any[] }> = {};
    for (const sd of pack.seedData) seeds[sd.model] = JSON.parse(fs.readFileSync(path.join(packDir, sd.file), 'utf8'));

    for (const model of MODEL_ORDER) {
      const data = seeds[model];
      if (!data || !data.rows || data.rows.length === 0) { report.installed[model] = 0; continue; }
      const client = modelClient(prisma, model);
      const refs = REF_MAP[model] || {};
      const arrRefs = ARRAY_REF[model] || {};
      let n = 0;
      for (const raw of data.rows) {
        try {
          const row: Record<string, any> = {};
          for (const k of Object.keys(raw)) {
            if (SKIP_FIELDS.includes(k)) continue;
            let v = raw[k];
            if (refs[k] && v != null && v !== '') {
              const mapped = idMap[refs[k]] && idMap[refs[k]][String(v)];
              if (mapped != null) v = BigInt(mapped);
            }
            if (arrRefs[k] && Array.isArray(v)) {
              const pModel = arrRefs[k];
              v = v.map((x: any) => {
                const m = idMap[pModel] && idMap[pModel][String(x)];
                return m != null ? m : x;
              });
            }
            row[k] = v;
          }
          row.siteId = siteId;
          const uniqKey = uniqueKeyFor(model, row);
          let target: any = null;
          if (uniqKey) target = await client.findFirst({ where: uniqKey });
          if (target) {
            if (!idMap[model]) idMap[model] = {};
            idMap[model][String(raw.id)] = String(target.id);
            report.skipped.push(`${model}#${raw.id}（${Object.keys(uniqKey!)[0]} 已存在，复用 id=${String(target.id)}）`);
            continue;
          }
          let created: any;
          try {
            created = await client.create({ data: row });
          } catch (e: any) {
            if (e && e.code === 'P2002') {
              const q: Record<string, any> = {};
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
        } catch (e: any) {
          report.failed.push(`${model}#${raw.id}: ${e.message}`);
        }
      }
      report.installed[model] = n;
    }

    await prisma.site.update({ where: { id: siteId }, data: { industryPack: pack.key, industryPackVersion: pack.version } });
    const rec = await prisma.industryPackRecord.create({
      data: { siteId, packKey: pack.key, packVersion: pack.version, action: 'install', result: report },
    });
    return { key: pack.key, version: pack.version, siteId: String(siteId), recordId: String(rec.id), report };
  } finally {
    await prisma.$disconnect();
  }
}

export async function uninstallPack(packKey: string, siteId: bigint) {
  const prisma = new PrismaClient();
  try {
    const rec = await prisma.industryPackRecord.findFirst({
      where: { siteId, packKey, action: 'install' }, orderBy: { id: 'desc' },
    });
    if (!rec) throw new Error('未找到安装记录：' + packKey + ' @ site ' + String(siteId));
    const deleted: Record<string, number> = {};
    for (let i = MODEL_ORDER.length - 1; i >= 0; i--) {
      const client = modelClient(prisma, MODEL_ORDER[i]);
      if (!client || !client.deleteMany) continue;
      const r = await client.deleteMany({ where: { siteId } });
      if (r.count) deleted[MODEL_ORDER[i]] = r.count;
    }
    await prisma.industryPackRecord.create({
      data: { siteId, packKey, packVersion: rec.packVersion, action: 'uninstall', result: deleted },
    });
    // 卸载后重置站点行业包标记
    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { industryPack: true } });
    if (site && site.industryPack === packKey) {
      await prisma.site.update({ where: { id: siteId }, data: { industryPack: null, industryPackVersion: null } });
    }
    return { key: packKey, siteId: String(siteId), deleted };
  } finally {
    await prisma.$disconnect();
  }
}

export async function getInstallRecords(siteId?: bigint) {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.industryPackRecord.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { id: 'desc' }, take: 50,
    });
    return rows.map(r => ({
      id: String(r.id), siteId: String(r.siteId), packKey: r.packKey,
      packVersion: r.packVersion, action: r.action, createdAt: r.createdAt.toISOString(),
    }));
  } finally {
    await prisma.$disconnect();
  }
}
