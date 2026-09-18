const { Client } = require('D:/阀门网站/node_modules/ssh2');
const c = new Client();
c.on('ready', () => {
  // Check API response size, then rebuild
  const cmd = `
echo "=== API RESPONSE SIZE ==="
curl -s http://127.0.0.1:3000/api/public/products | wc -c
echo ""
echo "=== START BUILD ==="
cd /var/www/valtrix && pnpm build > /tmp/build_valtrix.log 2>&1
echo "BUILD_EXIT=$?"
tail -30 /tmp/build_valtrix.log
echo ""
echo "=== RESTART ==="
pm2 restart valtrix --update-env 2>&1 | tail -3
sleep 5
echo ""
echo "=== VERIFY ==="
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/
curl -s http://127.0.0.1:3000/api/public/products | head -c 200
echo ""
`;
  c.exec(cmd, (e, s) => {
    if (e) { console.log('ERR', e.message); c.end(); return; }
    let o = '';
    s.on('close', () => { console.log(o.trim()); c.end(); })
     .on('data', d => o += d).stderr.on('data', d => o += d);
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
setTimeout(() => { try { c.end(); } catch (e) {} }, 300000);
