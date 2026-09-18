const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
function run(cmd, timeout = 60000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => { if (err) return reject(err); let out = ''; const t = setTimeout(() => { stream.close(); resolve({ code: -1, out }); }, timeout); stream.on('close', c => { clearTimeout(t); resolve({ code: c, out }); }); stream.on('data', d => out += d); stream.stderr.on('data', d => out += d); });
  });
}
function upload(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => { if (err) return reject(err); sftp.fastPut(localPath, remotePath, e => { sftp.end(); e ? reject(e) : resolve(); }); });
  });
}
(async () => {
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect({ host: '47.57.241.85', username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, readyTimeout: 30000 }));
  await upload(path.join(__dirname, '_remote_verify.js'), '/tmp/_remote_verify.js');
  const r = await run('node /tmp/_remote_verify.js 2>&1', 60000);
  console.log(r.out);
  conn.end(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
