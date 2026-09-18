// Remote probe: dump server products (run on server via node)
const { PrismaClient } = require('/var/www/valtrix/lib/generated/prisma');
const p = new PrismaClient();
(async () => {
  const prods = await p.product.findMany({
    select: { id: true, slug: true, model: true, name: true, summary: true },
    orderBy: { id: 'asc' },
  });
  console.log('COUNT=' + prods.length);
  for (const x of prods) {
    const sum = (x.summary || '').replace(/\s/g, '').slice(0, 45);
    console.log([x.id, x.slug, x.model, (x.name || '').slice(0, 32), sum].join(' | '));
  }
  const specCount = await p.productSpec.count();
  console.log('SPECS=' + specCount);
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
