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
(async () => {
  const conn = new ssh2.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  console.log(await sshExec(conn, 'curl -s -o /dev/null -w "local3000:%{http_code}\n" http://127.0.0.1:3000/uploads/page-hero/robots-1.jpg; ls -la /var/www/valtrix/public/uploads/page-hero/; pm2 restart valtrix && sleep 5 && curl -s -o /dev/null -w "after-restart:%{http_code}\n" http://127.0.0.1:3000/uploads/page-hero/robots-1.jpg'));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
