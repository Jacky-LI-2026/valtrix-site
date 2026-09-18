// 查询服务器 DB 全部产品状态
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  const sql = `SELECT p.id, t.slug as tab_slug, t.name as tab_name, c.slug as cat_slug, c.name as cat_name, p.slug, p.name, p."nameEn", p.model FROM products p JOIN product_categories c ON p."categoryId"=c.id JOIN product_tabs t ON c."tabId"=t.id ORDER BY t.id, c.id, p.id;`;
  const cmd = `PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -A -F '|' -c "${sql.replace(/"/g, '\\"')}"`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 30000);
