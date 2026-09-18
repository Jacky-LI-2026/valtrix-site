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
function put(conn, local, remote) {
  return new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : sftp.fastPut(local, remote, e => e ? rej(e) : res())));
}
(async () => {
  const conn = new ssh2.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  await put(conn, 'D:/阀门网站/scripts/_set_hero_cfg.sql', '/root/_set_hero_cfg.sql');
  const cmd = 'cd /var/www/valtrix && DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\') && psql "$DBURL" -f /root/_set_hero_cfg.sql 2>&1 | tail -3 && psql "$DBURL" -t -c "SELECT count(*) FROM (SELECT jsonb_object_keys(\\"configValue\\") FROM site_config WHERE \\"configKey\\"=\'page_hero_config\') t"';
  console.log(await sshExec(conn, cmd));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
