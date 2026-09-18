/** VALTRIX 服务器诊断 */
const { Client } = require('ssh2');
const HOST = process.argv[2];
if (!HOST) { console.error('usage: node scripts/_diag_valtrix.js <host>'); process.exit(1); }
const conn = new Client();
const cmds = [
  'echo ====DIR====; ls -la /var/www/ 2>&1; ls /var/www/valtrix 2>&1 | head -20',
  'echo ====ENV====; which node pnpm pm2; node -v; pnpm -v; pm2 -v',
  'echo ====PG====; systemctl is-active postgresql; su - postgres -c "psql -lqt" 2>&1 | grep -i zuowen',
  'echo ====DISK====; df -h / | tail -1',
  'echo ====UPTIME====; uptime',
];
conn.on('ready', () => {
  console.log('connected', HOST);
  (function run(i){
    if (i>=cmds.length){ conn.end(); process.exit(0); }
    conn.exec(cmds[i], (err, stream) => {
      if (err){ console.error('exec err', err.message); conn.end(); process.exit(1); }
      let out='';
      stream.on('close', () => { console.log(out.trim().slice(-1200)); run(i+1); })
        .on('data', d=>out+=d.toString())
        .stderr.on('data', d=>out+=d.toString());
    });
  })(0);
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
