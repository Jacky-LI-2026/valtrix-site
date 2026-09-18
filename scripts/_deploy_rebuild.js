// VALTRIX 产品数据重建部署脚本
// 用法: node scripts/_deploy_rebuild.js
// 前置: data/xinval-scrape/rebuild_products.sql 已生成, public/uploads/products/xinval/ 有图片
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');

const HOST = '47.57.241.85';
const USER = 'root';
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY_DIR = '/var/www/valtrix';
const SQL_FILE = path.join(__dirname, '..', 'data', 'xinval-scrape', 'rebuild_products.sql');
const IMG_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products', 'xinval');

const conn = new Client();
const log = (m) => console.log('[' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '] ' + m);

function run(cmd, timeout = 120000) {
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
    log('连接服务器 ' + HOST + ' ...');
    await new Promise((res, rej) => {
      conn.on('ready', res).on('error', rej).connect({
        host: HOST, username: USER, password: PASS,
        keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
      });
    });
    log('SSH 已连接');

    // 1. 上传 SQL
    log('上传 SQL 文件...');
    await upload(SQL_FILE, '/tmp/rebuild_products.sql');
    log('SQL 已上传 (' + (fs.statSync(SQL_FILE).size / 1024).toFixed(0) + ' KB)');

    // 2. 创建图片目录并上传
    log('创建远程图片目录...');
    await run(`mkdir -p ${DEPLOY_DIR}/public/uploads/products/xinval`);
    
    const images = fs.readdirSync(IMG_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    log(`上传 ${images.length} 张图片...`);
    for (let i = 0; i < images.length; i++) {
      await upload(path.join(IMG_DIR, images[i]), `${DEPLOY_DIR}/public/uploads/products/xinval/${images[i]}`);
      if ((i + 1) % 10 === 0) log(`  已上传 ${i + 1}/${images.length}`);
    }
    log(`图片上传完成 (${images.length} 张)`);

    // 3. 执行 SQL
    log('执行产品数据重建 SQL...');
    const sqlResult = await run(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -f /tmp/rebuild_products.sql 2>&1 | tail -20`, 120000);
    log('SQL 执行结果 (exit=' + sqlResult.code + '):');
    console.log(sqlResult.out.slice(-2000));

    // 4. 验证数据
    log('验证数据...');
    const verify = await run(`PGPASSWORD='__REMOVED_DEAD_PASSWORD__' psql -U postgres -h localhost -d zuowen_valve -t -c "SELECT 'tabs', count(*) FROM product_tabs; SELECT 'categories', count(*) FROM product_categories; SELECT 'products', count(*) FROM products; SELECT 'specs', count(*) FROM product_specs;"`);
    log('数据统计:');
    console.log(verify.out.trim());

    // 5. 重启 pm2
    log('重启 pm2 valtrix...');
    const restart = await run(`pm2 restart valtrix --update-env 2>&1; sleep 3; pm2 status valtrix 2>&1 | head -5`);
    console.log(restart.out);

    // 6. 健康检查
    log('健康检查...');
    await new Promise(r => setTimeout(r, 5000));
    const health = await run(`curl -s -o /dev/null -w 'HTTP %{http_code}' http://127.0.0.1:3000/; echo; curl -s http://127.0.0.1:3000/api/public/products 2>&1 | head -c 500; echo`);
    console.log(health.out);

    log('部署完成!');
    conn.end();
    process.exit(0);
  } catch (e) {
    console.error('部署失败:', e.message);
    try { conn.end(); } catch {}
    process.exit(1);
  }
})();
