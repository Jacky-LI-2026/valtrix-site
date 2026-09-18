const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const c = new ssh2.Client();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise((res, rej) => { c.on('ready', res); c.on('error', rej); c.connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  let done = false;
  for (let i = 0; i < 90; i++) {
    const t = await new Promise((res) => c.exec('tail -1 /tmp/b9.log 2>/dev/null', (e, s) => { let o = ''; s.on('data', d => o += d); s.stderr.on('data', d => o += 'E:' + d); s.on('close', () => res(o)); }));
    if (t.includes('BUILD_EXIT')) { done = true; console.log('done at', i * 20, 's:', t.trim()); break; }
    if (i % 6 === 0) console.log('...', i * 20, 's', t.trim().slice(0, 80));
    await sleep(20000);
  }
  if (!done) console.log('TIMEOUT');
  const tail = await new Promise((res) => c.exec('tail -5 /tmp/b9.log', (e, s) => { let o = ''; s.on('data', d => o += d); s.on('close', () => res(o)); }));
  console.log('TAIL:', tail);
  const restart = await new Promise((res) => c.exec('cd /var/www/valtrix && pm2 restart valtrix >/dev/null 2>&1 && sleep 8 && curl -s https://www.valvetrix.com/ | grep -o "tel:+86[0-9]*" | head -2; curl -s -o /dev/null -w "code:%{http_code}\n" https://www.valvetrix.com/news', (e, s) => { let o = ''; s.on('data', d => o += d); s.stderr.on('data', d => o += 'E:' + d); s.on('close', () => res(o)); }));
  console.log('VERIFY:', restart);
  c.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
