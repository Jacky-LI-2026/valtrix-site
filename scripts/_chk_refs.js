const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
const sql = `SELECT 'shop_products_total', count(*) FROM shop_products;
SELECT 'shop_products_with_product', count(*) FROM shop_products WHERE "productId" IS NOT NULL;
SELECT 'menu_product_links', count(*) FROM menu WHERE url LIKE '%/products/%';
SELECT 'shop_product_ids', string_agg(CAST("productId" AS text), ',') FROM shop_products WHERE "productId" IS NOT NULL LIMIT 10;`;
c.on('ready', () => {
  c.exec(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "${sql.replace(/"/g, '\\"')}"`, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 25000);
