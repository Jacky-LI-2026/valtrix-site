const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  const sql = `SELECT id, slug, COALESCE(title,''), COALESCE(titleEn,''), COALESCE(content::text,''), COALESCE(contentEn::text,'(NULL)') FROM about_sections WHERE slug IN ('culture','profile','history','honors','contact') ORDER BY id;`;
  const cmd = `PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -c "${sql.replace(/"/g, '\\"')}"`;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    stream.on('close', () => { console.log(out.slice(0, 7000)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
