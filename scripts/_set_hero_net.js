const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const fs = require('fs');
const { execSync } = require('child_process');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
function sshExec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += 'ERR:' + d);
      s.on('close', () => res(o));
    });
  });
}
function put(conn, local, remote) {
  return new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : sftp.fastPut(local, remote, e => e ? rej(e) : res())));
}
(async () => {
  const conn = new ssh2.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  // 1. 创建目录并上传 6 张网络图
  console.log(await sshExec(conn, 'mkdir -p /var/www/valtrix/public/uploads/page-hero && echo dir-ok'));
  const files = ['robots-1.jpg', 'cleanroom-1.jpg', 'cleanroom-2.jpg', 'wafer-inspect.jpg', 'wafer-probe.jpg', 'fab-outside.jpg'];
  for (const f of files) {
    await put(conn, 'D:/阀门网站/scripts/_img_probe/' + f, '/var/www/valtrix/public/uploads/page-hero/' + f);
  }
  console.log(await sshExec(conn, 'ls -la /var/www/valtrix/public/uploads/page-hero/ | tail -8'));
  // 2. 生成新配置 SQL（本地+服务器）
  const cfg = {
    '/about':      { backgroundImage: '/uploads/page-hero/robots-1.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/industries': { backgroundImage: '/uploads/page-hero/cleanroom-1.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/news':       { backgroundImage: '/uploads/page-hero/wafer-inspect.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/services':   { backgroundImage: '/uploads/page-hero/cleanroom-2.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/products':   { backgroundImage: '/uploads/oem/dv22a-mr8.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/careers':    { backgroundImage: '/uploads/page-hero/wafer-probe.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/contact':    { backgroundImage: '/uploads/page-hero/fab-outside.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
    '/resources':  { backgroundImage: '/uploads/oem/GG_1.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  };
  const sql = `DELETE FROM site_config WHERE "configKey"='page_hero_config';\nINSERT INTO site_config ("configKey","configValue","updatedAt") VALUES ('page_hero_config', '${JSON.stringify(cfg)}'::jsonb, NOW());\n`;
  fs.writeFileSync('D:/阀门网站/scripts/_set_hero_cfg.sql', sql, 'utf8');
  // 本地执行
  execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_set_hero_cfg.sql -o D:/阀门网站/scripts/_set_hero_cfg.out`);
  console.log('local:', fs.readFileSync('D:/阀门网站/scripts/_set_hero_cfg.out', 'utf8').trim() || 'OK');
  // 服务器执行
  await put(conn, 'D:/阀门网站/scripts/_set_hero_cfg.sql', '/root/_set_hero_cfg.sql');
  const dbCmd = 'cd /var/www/valtrix && DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\') && psql "$DBURL" -f /root/_set_hero_cfg.sql 2>&1 | tail -2';
  console.log('server:', await sshExec(conn, dbCmd));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
