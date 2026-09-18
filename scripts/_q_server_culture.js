const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  const sql = `SELECT 'ID='||id||' SLUG='||slug||'\nTITLE_EN='||COALESCE("titleEn",'')||'\nCONTENT='||left(content::text,600)||'\nCONTENT_EN='||left(COALESCE("contentEn"::text,'(NULL)'),600)||'\nCONTENT_JA='||left(COALESCE("contentJa"::text,'(NULL)'),120)||'\nCONTENT_KO='||left(COALESCE("contentKo"::text,'(NULL)'),120) FROM about_sections WHERE slug='culture';`;
  const cmd = `PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -c "${sql.replace(/"/g, '\\"')}"`;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    stream.on('close', () => { console.log(out.slice(0, 4000)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
