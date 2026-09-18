// Upload _remote_probe.js to server and run it
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const HOST = '47.57.241.85';
const conn = new Client();
const REMOTE = '/tmp/_remote_probe.js';
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
      sftp.fastPut(localPath, remotePath, (e) => { sftp.end(); e ? reject(e) : resolve(); });
    });
  });
}
(async () => {
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect({
    host: HOST, username: 'root', password: '__REMOVED_DEAD_PASSWORD__',
    keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
  }));
  console.log('SSH connected');
  await upload(path.join(__dirname, '_remote_probe.js'), REMOTE);
  console.log('uploaded probe');
  const r = await run('cd /var/www/valtrix && node ' + REMOTE + ' 2>&1', 120000);
  console.log(r.out);
  conn.end();
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); try{conn.end();}catch{} process.exit(1); });
