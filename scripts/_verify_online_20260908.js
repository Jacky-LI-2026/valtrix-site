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
  const out = await sshExec(conn, 'curl -s -o /tmp/vt_svc.json -w "%{http_code}" https://www.valvetrix.com/api/public/services; echo; head -c 600 /tmp/vt_svc.json');
  console.log(out);
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
