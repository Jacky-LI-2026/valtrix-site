// 从 consolidated_all.json 生成 lib/products.ts 静态数据（基础信息，无 specs）
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'data', 'xinval-scrape', 'consolidated_all_v2.json');
const OUTPUT = path.join(__dirname, '..', 'lib', 'products.ts');

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

function escStr(s) {
  if (s === null || s === undefined) return "''";
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const lines = [];
lines.push('// VALTRIX 产品数据 - 三层结构：Tab 大分类 → Category 子分类 → Model 具体型号');
lines.push('// 自动生成于 ' + new Date().toISOString() + '，数据源：芯阀科技官网');
lines.push('');
lines.push('export interface ProductSpec {');
lines.push('  label: string;');
lines.push('  value: string;');
lines.push('  labelEn?: string;');
lines.push('  valueEn?: string;');
lines.push('}');
lines.push('');
lines.push('export interface ProductModel {');
lines.push('  id: string;');
lines.push('  name: string;');
lines.push('  nameEn?: string;');
lines.push('  nameJa?: string;');
lines.push('  nameKo?: string;');
lines.push('  nameFr?: string;');
lines.push('  nameAr?: string;');
lines.push('  model: string;');
lines.push('  image: string;');
lines.push('  images?: string[];');
lines.push('  description: string;');
lines.push('  descriptionEn?: string;');
lines.push('  specs: ProductSpec[];');
lines.push('  purchaseMode?: string;');
lines.push('  shopSlug?: string;');
lines.push('  frames360?: { path: string; count: number; startIndex?: number };');
lines.push('  detailContent?: string;');
lines.push('  detailContentEn?: string;');
lines.push('  features?: string[];');
lines.push('  featuresEn?: string[];');
lines.push('  manualUrl?: string;');
lines.push('  manualUrlEn?: string;');
lines.push('  subtitle?: string;');
lines.push('  subtitleEn?: string;');
lines.push('  summary?: string;');
lines.push('  summaryEn?: string;');
lines.push('}');
lines.push('');
lines.push('export interface ProductCategory {');
lines.push('  id: string;');
lines.push('  name: string;');
lines.push('  nameEn?: string;');
lines.push('  nameJa?: string;');
lines.push('  nameKo?: string;');
lines.push('  nameFr?: string;');
lines.push('  nameAr?: string;');
lines.push('  icon?: string;');
lines.push('  description?: string;');
lines.push('  descriptionEn?: string;');
lines.push('  models: ProductModel[];');
lines.push('}');
lines.push('');
lines.push('export interface ProductTab {');
lines.push('  id: string;');
lines.push('  name: string;');
lines.push('  nameEn?: string;');
lines.push('  nameJa?: string;');
lines.push('  nameKo?: string;');
lines.push('  nameFr?: string;');
lines.push('  nameAr?: string;');
lines.push('  purchaseMode?: string;');
lines.push('  categories: ProductCategory[];');
lines.push('}');
lines.push('');
lines.push('export const productTabs: ProductTab[] = [');

for (const tab of data.tabs) {
  if (!tab.categories || tab.categories.length === 0) continue;
  lines.push('  {');
  lines.push('    id: ' + escStr(tab.slug) + ',');
  lines.push('    name: ' + escStr(tab.name) + ',');
  lines.push('    nameEn: ' + escStr(tab.nameEn || tab.name) + ',');
  lines.push('    nameJa: ' + escStr(tab.nameJa || tab.name) + ',');
  lines.push('    nameKo: ' + escStr(tab.nameKo || tab.name) + ',');
  lines.push('    nameFr: ' + escStr(tab.nameFr || tab.name) + ',');
  lines.push('    nameAr: ' + escStr(tab.nameAr || tab.name) + ',');
  lines.push('    purchaseMode: ' + escStr(tab.purchaseMode || 'quote') + ',');
  lines.push('    categories: [');
  for (const cat of tab.categories) {
    if (!cat.products || cat.products.length === 0) continue;
    lines.push('      {');
    lines.push('        id: ' + escStr(cat.slug) + ',');
    lines.push('        name: ' + escStr(cat.name) + ',');
    lines.push('        nameEn: ' + escStr(cat.nameEn || cat.name) + ',');
    lines.push('        nameJa: ' + escStr(cat.nameJa || cat.name) + ',');
    lines.push('        nameKo: ' + escStr(cat.nameKo || cat.name) + ',');
    lines.push('        nameFr: ' + escStr(cat.nameFr || cat.name) + ',');
    lines.push('        nameAr: ' + escStr(cat.nameAr || cat.name) + ',');
    lines.push('        icon: ' + escStr('Package') + ',');
    lines.push('        description: ' + escStr('') + ',');
    lines.push('        descriptionEn: ' + escStr('') + ',');
    lines.push('        models: [');
    for (const prod of cat.products) {
      lines.push('          {');
      lines.push('            id: ' + escStr(prod.slug) + ',');
      lines.push('            name: ' + escStr(prod.name) + ',');
      lines.push('            nameEn: ' + escStr(prod.nameEn || prod.name) + ',');
      lines.push('            nameJa: ' + escStr(prod.nameJa || prod.name) + ',');
      lines.push('            nameKo: ' + escStr(prod.nameKo || prod.name) + ',');
      lines.push('            nameFr: ' + escStr(prod.nameFr || prod.name) + ',');
      lines.push('            nameAr: ' + escStr(prod.nameAr || prod.name) + ',');
      lines.push('            model: ' + escStr(prod.model || prod.slug) + ',');
      lines.push('            image: ' + escStr(prod.coverImage || '') + ',');
      lines.push('            images: ' + JSON.stringify(prod.images || [prod.coverImage].filter(Boolean)) + ',');
      lines.push('            description: ' + escStr(prod.summary || '') + ',');
      lines.push('            descriptionEn: ' + escStr(prod.summaryEn || prod.summary || '') + ',');
      lines.push('            specs: [],');
      lines.push('            purchaseMode: ' + escStr('quote') + ',');
      lines.push('          },');
    }
    lines.push('        ],');
    lines.push('      },');
  }
  lines.push('    ],');
  lines.push('  },');
}
lines.push('];');
lines.push('');

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log('Generated:', OUTPUT);
console.log('Size:', (fs.statSync(OUTPUT).size / 1024).toFixed(1), 'KB');
