const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
c.on('ready', () => {
  c.exec('tail -60 /tmp/b8.log; echo ===PS===; ps aux | grep -E "next build|pnpm build" | grep -v grep | head -3', (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'E:' + d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('ERR', e.message); });
c.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
