/** 验证服务器数据：specs 数量 + coverImage */
const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec(`PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -t -c "SELECT p.slug, jsonb_array_length(COALESCE(p.specs,'[]'::jsonb)) AS specs, COALESCE(p.coverImage,'N/A') FROM products p ORDER BY p.id LIMIT 17;"`, (e, s) => {
    if (e) { console.error(e.message); process.exit(1); }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
      .on('data', d => o += d)
      .stderr.on('data', d => o += d);
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
c.connect({ host: '47.57.241.85', username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000 });
