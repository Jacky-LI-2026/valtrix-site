const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
c.on('ready', () => {
  c.exec('ls -la /var/www/valtrix/public/uploads/oem/ 2>/dev/null | head -40; echo ---; ls /var/www/valtrix/public/uploads/ 2>/dev/null | head -20', (e, s) => {
    if (e) { console.log('err', e.message); c.end(); return; }
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'ERR:' + d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('SSH', e.message); process.exit(1); })
.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
