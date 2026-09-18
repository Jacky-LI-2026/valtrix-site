// 服务器 DB 全语种验证 + pm2 restart valtrix
const { execSync } = require('child_process');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;

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

async function main() {
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', res);
    conn.on('error', rej);
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 });
  });

  const cmd = [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    // 全语种非空验证
    `psql "$DBURL" -c "SELECT id, title, \\"titleEn\\", \\"titleJa\\", \\"titleKo\\", \\"titleFr\\", \\"titleAr\\", (\\"descriptionEn\\" IS NOT NULL) AS dEn, (\\"descriptionAr\\" IS NOT NULL) AS dAr, (\\"featuresFr\\" IS NOT NULL) AS fFr FROM services ORDER BY id;"`,
    // 检查 pm2 进程
    'pm2 list | grep -E "valtrix|name" | head -5',
  ].join(' && ');
  console.log((await sshExec(conn, cmd)).slice(-2500));

  // pm2 restart
  console.log('--- pm2 restart valtrix ---');
  console.log((await sshExec(conn, 'cd /var/www/valtrix && pm2 restart valtrix')).slice(-500));

  conn.end();
  console.log('完成');
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
