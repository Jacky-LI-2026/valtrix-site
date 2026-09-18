// 上传新 SQL 到服务器并执行（带 ON_ERROR_STOP），最后验证
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');

const SQL_FILE = path.join(__dirname, '..', 'data', 'xinval-scrape', 'rebuild_products.sql');
const HOST = '47.57.241.85';

const conn = new Client();
const log = (m) => console.log('[' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '] ' + m);

function run(cmd, timeout = 180000) {
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

    log('上传 SQL (' + (fs.statSync(SQL_FILE).size / 1024).toFixed(0) + ' KB)...');
    await upload(SQL_FILE, '/tmp/rebuild_products.sql');
    log('上传完成');

    log('执行 SQL (ON_ERROR_STOP)...');
    const result = await run(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -v ON_ERROR_STOP=1 -f /tmp/rebuild_products.sql > /tmp/sql_out.txt 2>&1; echo "EXIT=$?"; tail -15 /tmp/sql_out.txt`, 180000);
    console.log(result.out);

    if (result.out.includes('EXIT=0') || result.out.includes('EXIT= ')) {
      log('SQL 执行成功!');
    } else {
      log('SQL 可能失败，检查错误...');
    }

    log('验证数据...');
    const verify = await run(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SELECT 'tabs', count(*) FROM product_tabs; SELECT 'cats', count(*) FROM product_categories; SELECT 'prods', count(*) FROM products; SELECT 'specs', count(*) FROM product_specs;"`);
    console.log(verify.out.trim());

    log('重启 pm2...');
    await run(`pm2 restart valtrix --update-env 2>&1 | tail -3`);
    await new Promise(r => setTimeout(r, 5000));

    log('健康检查...');
    const health = await run(`curl -s -o /dev/null -w 'HTTP %{http_code}' http://127.0.0.1:3000/; echo; curl -s http://127.0.0.1:3000/api/public/products 2>&1 | head -c 300; echo`);
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
