// Backup VALTRIX product tables from server to local CSV
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
const OUT = 'D:/阀门网站/data/xinval-scrape';

const tables = ['product_tabs', 'product_categories', 'products', 'product_specs'];
let idx = 0;

function next() {
  if (idx >= tables.length) {
    console.log('ALL BACKUP DONE');
    conn.end();
    return;
  }
  const t = tables[idx++];
  const cmd = `PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -A -F'|' -c "SELECT * FROM ${t} ORDER BY id;" > /tmp/backup_${t}.txt 2>&1; wc -l /tmp/backup_${t}.txt`;
  conn.exec(cmd, (e, st) => {
    if (e) { console.log(`ERR ${t}:`, e.message); next(); return; }
    let o = '';
    st.on('close', () => {
      console.log(`${t}: ${o.trim()}`);
      // download
      conn.sftp((err, sftp) => {
        if (err) { console.log('SFTP ERR', err.message); next(); return; }
        sftp.fastGet(`/tmp/backup_${t}.txt`, `${OUT}/backup_${t}.txt`, (e2) => {
          if (e2) console.log(`DOWNLOAD ERR ${t}:`, e2.message);
          else console.log(`  downloaded -> backup_${t}.txt`);
          sftp.end();
          next();
        });
      });
    }).on('data', d => o += d).stderr.on('data', d => o += d);
  });
}

conn.on('ready', () => {
  console.log('SSH connected, starting backup...');
  next();
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { conn.end(); } catch (e) {} }, 60000);
