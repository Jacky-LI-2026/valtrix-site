// VALTRIX 产品数据重建 - 使用 Prisma 直接插入（绕过 psql 编码问题）
// 在服务器上运行: node /tmp/rebuild_products_prisma.js
const fs = require('fs');
const { PrismaClient } = require('/var/www/valtrix/lib/generated/prisma');

const prisma = new PrismaClient();
const LANGS = ['En', 'Ja', 'Ko', 'Fr', 'Ar'];

// Clean string: remove NUL bytes and other invalid control chars (keep \n \t \r)
function clean(s) {
  if (s === null || s === undefined) return s;
  if (typeof s !== 'string') return s;
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}
function trunc(s, max) {
  if (s === null || s === undefined) return s;
  if (typeof s !== 'string') return s;
  return s.length > max ? s.substring(0, max) : s;
}
function cleanObj(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return clean(obj);
  if (Array.isArray(obj)) return obj.map(cleanObj);
  if (typeof obj === 'object') {
    const r = {};
    for (const k in obj) r[k] = cleanObj(obj[k]);
    return r;
  }
  return obj;
}

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/consolidated_all.json', 'utf8'));
  // Clean all strings: remove NUL bytes and invalid control characters
  const cleaned = cleanObj(data);
  console.log('Loaded & cleaned JSON:', cleaned.tabs.length, 'tabs');

  // Delete old data (order: specs -> products -> categories -> tabs)
  console.log('Deleting old data...');
  await prisma.productSpec.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.productTab.deleteMany({});
  console.log('Old data deleted.');

  let tabCount = 0, catCount = 0, prodCount = 0, specCount = 0;

  for (const tab of cleaned.tabs) {
    tabCount++;
    const tabData = {
      id: tabCount,
      slug: tab.slug,
      name: tab.name,
      purchaseMode: 'quote',
      sortOrder: tab.sortOrder || tabCount,
    };
    LANGS.forEach(l => { tabData['name' + l] = trunc(tab['name' + l] || tab.name, 100); });
    await prisma.productTab.create({ data: tabData });

    if (!tab.categories) continue;
    for (const cat of tab.categories) {
      catCount++;
      const catData = {
        id: catCount,
        tabId: tabCount,
        slug: cat.slug,
        name: cat.name,
        sortOrder: cat.sortOrder || catCount,
      };
      LANGS.forEach(l => { catData['name' + l] = trunc(cat['name' + l] || cat.name, 100); });
      await prisma.productCategory.create({ data: catData });

      if (!cat.products) continue;
      for (const prod of cat.products) {
        prodCount++;
        const prodData = {
          id: prodCount,
          tabId: tabCount,
          categoryId: catCount,
          slug: trunc(prod.slug, 100),
          model: trunc(prod.model || prod.slug, 100),
          name: trunc(prod.name, 200),
          summary: prod.summary || '',
          description: prod.description || '',
          features: prod.features || [],
          coverImage: prod.coverImage || null,
          images: prod.images || [prod.coverImage].filter(Boolean),
          sortOrder: prod.sortOrder || prodCount,
          status: 'published',
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        LANGS.forEach(l => {
          prodData['name' + l] = trunc(prod['name' + l] || prod.name, 200);
          prodData['subtitle' + l] = trunc(prod['subtitle' + l] || null, 300);
          prodData['summary' + l] = prod['summary' + l] || prod.summary || '';
          prodData['description' + l] = prod['description' + l] || prod.description || '';
          prodData['features' + l] = prod['features' + l] || prod.features || [];
        });
        await prisma.product.create({ data: prodData });

        if (!prod.specs) continue;
        for (let i = 0; i < prod.specs.length; i++) {
          const sp = prod.specs[i];
          specCount++;
          const specData = {
            id: specCount,
            productId: prodCount,
            groupName: trunc(sp.groupName || null, 100),
            label: trunc(sp.label || '', 100),
            value: sp.value || '',
            sortOrder: sp.sortOrder || (i + 1),
          };
          LANGS.forEach(l => {
            specData['label' + l] = trunc(sp['label' + l] || sp.label || '', 100);
            specData['value' + l] = sp['value' + l] || sp.value || '';
          });
          await prisma.productSpec.create({ data: specData });
        }
      }
    }
  }

  console.log(`Done! Tabs: ${tabCount}, Categories: ${catCount}, Products: ${prodCount}, Specs: ${specCount}`);

  // Verify
  const t = await prisma.productTab.count();
  const c = await prisma.productCategory.count();
  const p = await prisma.product.count();
  const s = await prisma.productSpec.count();
  console.log(`Verify: tabs=${t}, cats=${c}, prods=${p}, specs=${s}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
