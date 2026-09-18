/** VALTRIX 数据库修复：设置 postgres 密码 + 验证 */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const cmds = [
  'echo ====AUTH====; grep -E "^(local|host)" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | grep -E "127.0.0.1|::1|all.*all" | head -6',
  "su - postgres -c \"psql -c \\\"ALTER USER postgres WITH PASSWORD '__REMOVED_DEAD_PASSWORD__';\\\"\"",
  'PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -c "SELECT 1 AS ok;"',
  'echo ====DONE====',
];
conn.on('ready', () => {
  console.log('connected', HOST);
  (function run(i){
    if (i>=cmds.length){ conn.end(); process.exit(0); }
    conn.exec(cmds[i], (err, stream) => {
      if (err){ console.error('exec err', err.message); conn.end(); process.exit(1); }
      let out='';
      stream.on('close', (code) => { console.log(out.trim().slice(-900)); run(i+1); })
        .on('data', d=>out+=d.toString())
        .stderr.on('data', d=>out+=d.toString());
    });
  })(0);
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
