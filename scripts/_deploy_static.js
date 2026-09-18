// 上传静态数据文件到服务器，重新构建，重启，验证
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');

const LOCAL_FILE = path.join(__dirname, '..', 'lib', 'products.ts');
const REMOTE_FILE = '/var/www/valtrix/lib/products.ts';
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

    log('上传 products.ts (' + (fs.statSync(LOCAL_FILE).size / 1024).toFixed(0) + ' KB)...');
    await upload(LOCAL_FILE, REMOTE_FILE);
    log('上传完成');

    log('重新构建...');
    const build = await run(`cd /var/www/valtrix && pnpm build > /tmp/build2.log 2>&1; echo "BUILD_EXIT=$?"; tail -10 /tmp/build2.log`, 300000);
    console.log(build.out);
    if (!build.out.includes('BUILD_EXIT=0')) {
      console.error('构建失败!');
      conn.end();
      process.exit(1);
    }

    log('重启 pm2...');
    await run(`pm2 restart valtrix --update-env 2>&1 | tail -3`);
    await new Promise(r => setTimeout(r, 5000));

    log('验证...');
    const verify = await run(`curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/; curl -s http://127.0.0.1:3000/api/public/products | head -c 200; echo`);
    console.log(verify.out);

    log('全部完成!');
    conn.end();
    process.exit(0);
  } catch (e) {
    console.error('失败:', e.message);
    try { conn.end(); } catch {}
    process.exit(1);
  }
})();
