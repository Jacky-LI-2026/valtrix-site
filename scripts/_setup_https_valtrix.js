/** VALTRIX HTTPS 配置：certbot + Let's Encrypt + 强制跳转 */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const cmds = [
  'echo ====INSTALL====; which certbot || (apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx)',
  'echo ====CERT====; certbot --nginx -d www.valvetrix.com -d valvetrix.com --non-interactive --agree-tos -m 17196600@qq.com --redirect 2>&1 | tail -20',
  'echo ====VERIFY====; curl -s -o /dev/null -w "https -> %{http_code}\\n" https://www.valvetrix.com/; curl -s -o /dev/null -w "http -> %{http_code} (redirect %{redirect_url})\\n" http://www.valvetrix.com/; ss -tlnp | grep -E ":(80|443)"',
];
conn.on('ready', () => {
  console.log('connected', HOST);
  (function run(i){
    if (i>=cmds.length){ conn.end(); process.exit(0); }
    conn.exec(cmds[i], (err, stream) => {
      if (err){ console.error('exec err', err.message); conn.end(); process.exit(1); }
      let out='';
      stream.on('close', (code) => { console.log(out.trim().slice(-1800)); if (code!==0){ console.error('[step fail]', code); } run(i+1); })
        .on('data', d=>out+=d.toString())
        .stderr.on('data', d=>out+=d.toString());
    });
  })(0);
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
