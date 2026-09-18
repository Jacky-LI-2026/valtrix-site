/** 部署代码：i18n默认英文 + Hero透明度 → 上传 → build → restart → 验证 */
const fs = require('fs');
const path = require('path');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const S = { host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 };
const FILES = [
  'config/i18n.ts',
  'lib/i18n.tsx',
  'components/sections/Hero.tsx',
  'lib/page-hero-config.tsx',
];
const DEST = '/var/www/valtrix';

const conn = new ssh2.Client();
function put(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const r = sftp.createWriteStream(remote);
      fs.createReadStream(local).pipe(r);
      r.on('close', () => resolve());
      r.on('error', reject);
    });
  });
}
function exec(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (e, s) => {
      if (e) return resolve('ERR:' + e.message);
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += 'ERR:' + d);
      s.on('close', () => resolve(o));
    });
  });
}
(async () => {
  conn.on('ready', async () => {
    try {
      for (const f of FILES) {
        const local = 'D:/阀门网站/' + f;
        if (!fs.existsSync(local)) { console.log('缺失:', f); continue; }
        await put(conn, local, DEST + '/' + f);
        console.log('上传:', f);
      }
      // 确认改动已上服务器
      const g = await exec(conn, `grep -n 'defaultLocale' ${DEST}/config/i18n.ts | head -2`);
      console.log('服务器 i18n.ts:', g.split('\n').filter(l => l.includes('defaultLocale')).join(' | '));
      // build
      console.log('开始 build...');
      const b = await exec(conn, `cd ${DEST} && pnpm build 2>&1 | tail -5`);
      console.log('build 结果:', b);
      // restart
      console.log('restart...');
      const r = await exec(conn, `pm2 restart valtrix 2>&1 | tail -3`);
      console.log('restart:', r);
      await new Promise(res => setTimeout(res, 6000));
      const h = await exec(conn, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/`);
      console.log('首页 HTTP:', h);
      conn.end();
    } catch (e) { console.error(e); conn.end(); }
  });
  conn.on('error', e => { console.error('SSH:', e.message); process.exit(1); });
  conn.connect(S);
})();
