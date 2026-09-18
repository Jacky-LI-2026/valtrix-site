// Deploy: backup server DB -> upload consolidated_all_v2.json + rebuild_products_v2.js -> run -> restart pm2 -> verify
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const HOST = '47.57.241.85';
const DIR = 'D:/阀门网站/data/xinval-scrape';
const conn = new Client();
const log = (m) => console.log('[' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '] ' + m);

function run(cmd, timeout = 600000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + '\n[TIMEOUT]' }); }, timeout);
      stream.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on('data', (d) => (out += d.toString()));
      stream.stderr.on('data', (d) => (out += d.toString()));
    });
  });
}
function upload(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (e) => { sftp.end(); e ? reject(e) : resolve(); });
    });
  });
}

(async () => {
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect({
    host: HOST, username: 'root', password: '__REMOVED_DEAD_PASSWORD__',
    keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
  }));
  log('SSH connected');

  // 1. backup current DB (safety net) using DATABASE_URL from .env
  log('备份服务器 DB...');
  const bk = await run(`cd /var/www/valtrix && DBURL=$(grep -E '^DATABASE_URL="?postgres' .env | head -1 | sed 's/^DATABASE_URL=//; s/^"//; s/"$//; s/?schema=[^&]*//') && PGPASSWORD=$(echo "$DBURL" | sed -n 's#.*://[^:]*:\\([^@]*\\)@.*#\\1#p') pg_dump "$DBURL" > /tmp/zuowen_valve_backup_before_v2.sql 2>/tmp/bk_err.txt && echo BACKUP_OK || (echo BACKUP_FAIL; cat /tmp/bk_err.txt)`, 120000);
  log(bk.out.trim().split('\n').slice(-3).join(' | '));

  // 2. upload files
  log('上传 consolidated_all_v2.json (' + (fs.statSync(path.join(DIR, 'consolidated_all_v2.json')).size / 1024 / 1024).toFixed(2) + ' MB)...');
  await upload(path.join(DIR, 'consolidated_all_v2.json'), '/tmp/consolidated_all_v2.json');
  log('上传 rebuild_products_v2.js...');
  await upload(path.join(DIR, 'rebuild_products_v2.js'), '/tmp/rebuild_products_v2.js');

  // 3. run rebuild
  log('执行重建脚本...');
  const r = await run(`cd /var/www/valtrix && node /tmp/rebuild_products_v2.js 2>&1`, 600000);
  console.log(r.out);
  if (r.code !== 0) { console.error('脚本失败 exit=' + r.code); conn.end(); process.exit(1); }

  // 4. restart pm2
  log('重启 pm2...');
  await run(`pm2 restart valtrix --update-env 2>&1 | tail -2`);
  await new Promise(r2 => setTimeout(r2, 5000));

  // 5. health check
  log('健康检查...');
  const h = await run(`curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://127.0.0.1:3000/; curl -s http://127.0.0.1:3000/api/public/products 2>&1 | head -c 300; echo`);
  console.log(h.out);

  log('DONE');
  conn.end();
  process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); try { conn.end(); } catch {} process.exit(1); });
