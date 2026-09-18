// 上传 JSON + Prisma 脚本到服务器，执行重建，重启 pm2，验证
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');

const JSON_FILE = path.join(__dirname, '..', 'data', 'xinval-scrape', 'consolidated_all.json');
const SCRIPT_FILE = path.join(__dirname, 'rebuild_products_prisma.js');
const HOST = '47.57.241.85';

const conn = new Client();
const log = (m) => console.log('[' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '] ' + m);

function run(cmd, timeout = 300000) {
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
      sftp.fastPut(localPath, remotePath, (e) => {
        sftp.end();
        if (e) reject(e); else resolve();
      });
    });
  });
}

(async () => {
  try {
    log('连接服务器...');
    await new Promise((res, rej) => {
      conn.on('ready', res).on('error', rej).connect({
        host: HOST, username: 'root', password: '__REMOVED_DEAD_PASSWORD__',
        keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
      });
    });
    log('SSH 已连接');

    log('上传 JSON (' + (fs.statSync(JSON_FILE).size / 1024).toFixed(0) + ' KB)...');
    await upload(JSON_FILE, '/tmp/consolidated_all.json');
    log('上传脚本...');
    await upload(SCRIPT_FILE, '/tmp/rebuild_products_prisma.js');

    log('执行 Prisma 重建脚本...');
    const result = await run(`cd /var/www/valtrix && node /tmp/rebuild_products_prisma.js 2>&1`, 300000);
    console.log(result.out);
    if (result.code !== 0) {
      console.error('脚本执行失败, exit=' + result.code);
      conn.end();
      process.exit(1);
    }

    log('重启 pm2...');
    await run(`pm2 restart valtrix --update-env 2>&1 | tail -3`);
    await new Promise(r => setTimeout(r, 5000));

    log('健康检查...');
    const health = await run(`curl -s -o /dev/null -w 'HTTP %{http_code}' http://127.0.0.1:3000/; echo; curl -s http://127.0.0.1:3000/api/public/products 2>&1 | head -c 400; echo`);
    console.log(health.out);

    log('全部完成!');
    conn.end();
    process.exit(0);
  } catch (e) {
    console.error('失败:', e.message);
    try { conn.end(); } catch {}
    process.exit(1);
  }
})();
