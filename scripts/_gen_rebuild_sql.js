// 生成 VALTRIX 产品数据重建 SQL
// 用法: node scripts/_gen_rebuild_sql.js
// 输入: data/xinval-scrape/consolidated_all.json
// 输出: data/xinval-scrape/rebuild_products.sql
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'data', 'xinval-scrape', 'consolidated_all.json');
const OUTPUT = path.join(__dirname, '..', 'data', 'xinval-scrape', 'rebuild_products.sql');

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  if (typeof s === 'object') return `'${JSON.stringify(s).replace(/'/g, "''")}'::jsonb`;
  return `'${String(s).replace(/'/g, "''")}'`;
}

function escStr(s) {
  if (s === null || s === undefined || s === '') return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

const LANGS = ['En', 'Ja', 'Ko', 'Fr', 'Ar'];
// Quote column names that contain uppercase (PostgreSQL folds unquoted to lowercase)
const q = (s) => /[A-Z]/.test(s) ? `"${s}"` : s;
const lines = [];

lines.push('-- VALTRIX product data rebuild');
lines.push('-- Generated: ' + new Date().toISOString());
lines.push('-- Tabs: 7, Categories: 14, Products: 44, Specs: 3555');
lines.push('BEGIN;');
lines.push('');
lines.push('-- Delete old data (order respects FK constraints)');
lines.push('DELETE FROM product_specs;');
lines.push('DELETE FROM products;');
lines.push('DELETE FROM product_categories;');
lines.push('DELETE FROM product_tabs;');
lines.push('');

// Reset sequences
lines.push('-- Reset sequences');
lines.push(`ALTER SEQUENCE product_tabs_id_seq RESTART WITH 1;`);
lines.push(`ALTER SEQUENCE product_categories_id_seq RESTART WITH 1;`);
lines.push(`ALTER SEQUENCE products_id_seq RESTART WITH 1;`);
lines.push(`ALTER SEQUENCE product_specs_id_seq RESTART WITH 1;`);
lines.push('');

let tabId = 0, catId = 0, prodId = 0, specId = 0;

// Insert tabs
lines.push('-- ===== PRODUCT TABS =====');
for (const tab of data.tabs) {
  tabId++;
  tab._id = tabId;
  const fields = ['id', 'slug', 'name', ...LANGS.map(l => q('name' + l)), q('purchaseMode'), q('sortOrder')];
  const values = [
    tabId,
    escStr(tab.slug),
    escStr(tab.name),
    ...LANGS.map(l => escStr(tab['name' + l] || tab.name)),
    escStr('quote'),
    tab.sortOrder || tabId,
  ];
  lines.push(`INSERT INTO product_tabs (${fields.join(',')}) VALUES (${values.join(',')});`);
}
lines.push('');

// Insert categories + products + specs
lines.push('-- ===== PRODUCT CATEGORIES =====');
for (const tab of data.tabs) {
  if (!tab.categories || tab.categories.length === 0) continue;
  for (const cat of tab.categories) {
    catId++;
    cat._id = catId;
    const fields = ['id', q('tabId'), 'slug', 'name', ...LANGS.map(l => q('name' + l)), q('sortOrder')];
    const values = [
      catId,
      tab._id,
      escStr(cat.slug),
      escStr(cat.name),
      ...LANGS.map(l => escStr(cat['name' + l] || cat.name)),
      cat.sortOrder || catId,
    ];
    lines.push(`INSERT INTO product_categories (${fields.join(',')}) VALUES (${values.join(',')});`);
  }
}
lines.push('');

lines.push('-- ===== PRODUCTS =====');
for (const tab of data.tabs) {
  if (!tab.categories) continue;
  for (const cat of tab.categories) {
    if (!cat.products) continue;
    for (const prod of cat.products) {
      prodId++;
      prod._id = prodId;
      const fields = [
        'id', q('tabId'), q('categoryId'), 'slug', 'model', 'name',
        ...LANGS.map(l => q('name' + l)),
        'subtitle', ...LANGS.map(l => q('subtitle' + l)),
        'summary', ...LANGS.map(l => q('summary' + l)),
        'description', ...LANGS.map(l => q('description' + l)),
        'features', ...LANGS.map(l => q('features' + l)),
        q('coverImage'), 'images', q('sortOrder'), 'status', q('publishedAt'), q('createdAt'), q('updatedAt'),
      ];
      const values = [
        prodId,
        tab._id,
        cat._id,
        escStr(prod.slug),
        escStr(prod.model || prod.slug),
        escStr(prod.name),
        ...LANGS.map(l => escStr(prod['name' + l] || prod.name)),
        // subtitle
        escStr(prod.subtitle || null),
        ...LANGS.map(l => escStr(prod['subtitle' + l] || prod.subtitle || null)),
        // summary
        escStr(prod.summary || ''),
        ...LANGS.map(l => escStr(prod['summary' + l] || prod.summary || '')),
        // description
        escStr(prod.description || ''),
        ...LANGS.map(l => escStr(prod['description' + l] || prod.description || '')),
        // features (JSON arrays)
        esc(prod.features || []),
        ...LANGS.map(l => esc(prod['features' + l] || prod.features || [])),
        // coverImage
        escStr(prod.coverImage || null),
        // images
        esc(prod.images || [prod.coverImage].filter(Boolean)),
        // sortOrder
        prod.sortOrder || prodId,
        escStr('published'),
        'NOW()',
        'NOW()',
        'NOW()',
      ];
      lines.push(`INSERT INTO products (${fields.join(',')}) VALUES (${values.join(',')});`);
    }
  }
}
lines.push('');

lines.push('-- ===== PRODUCT SPECS =====');
for (const tab of data.tabs) {
  if (!tab.categories) continue;
  for (const cat of tab.categories) {
    if (!cat.products) continue;
    for (const prod of cat.products) {
      if (!prod.specs || prod.specs.length === 0) continue;
      for (let i = 0; i < prod.specs.length; i++) {
        const sp = prod.specs[i];
        specId++;
        const fields = [
          'id', q('productId'), q('groupName'), 'label',
          ...LANGS.map(l => q('label' + l)),
          'value', ...LANGS.map(l => q('value' + l)),
          q('sortOrder'),
        ];
        const values = [
          specId,
          prod._id,
          escStr(sp.groupName || null),
          escStr(sp.label || ''),
          ...LANGS.map(l => escStr(sp['label' + l] || sp.label || '')),
          escStr(sp.value || ''),
          ...LANGS.map(l => escStr(sp['value' + l] || sp.value || '')),
          sp.sortOrder || (i + 1),
        ];
        lines.push(`INSERT INTO product_specs (${fields.join(',')}) VALUES (${values.join(',')});`);
      }
    }
  }
}
lines.push('');

lines.push('COMMIT;');
lines.push('');
lines.push('-- Verification counts');
lines.push("SELECT 'tabs', count(*) FROM product_tabs;");
lines.push("SELECT 'categories', count(*) FROM product_categories;");
lines.push("SELECT 'products', count(*) FROM products;");
lines.push("SELECT 'specs', count(*) FROM product_specs;");

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`SQL generated: ${OUTPUT}`);
console.log(`  Tabs: ${tabId}, Categories: ${catId}, Products: ${prodId}, Specs: ${specId}`);
console.log(`  File size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
