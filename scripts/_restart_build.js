const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
c.on('ready', () => {
  c.exec('df -h / | tail -1; free -m | head -2; cat /root/_build_remote.sh; echo ===; ls -la /var/www/valtrix/.next 2>/dev/null | head -3; echo ===; pkill -9 -f "next build" 2>/dev/null; pkill -9 -f "pnpm build" 2>/dev/null; sleep 1; rm -rf /var/www/valtrix/.next; cd /var/www/valtrix && setsid bash -c "pnpm build > /tmp/b9.log 2>&1; echo BUILD_EXIT=$? >> /tmp/b9.log" < /dev/null > /dev/null 2>&1 & echo STARTED', (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'E:' + d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.log('ERR', e.message); });
c.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
