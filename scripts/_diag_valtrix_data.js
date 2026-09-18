/** VALTRIX 服务器数据现状诊断 */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const cmds = [
  'echo ====UPLOADS====; ls /var/www/valtrix/public/uploads/oem 2>&1 | head -40',
  'echo ====DB_COUNTS====; PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -t -c "SELECT \'products\',count(*) FROM products UNION ALL SELECT \'specs\',count(*) FROM product_specs UNION ALL SELECT \'tabs\',count(*) FROM product_tabs UNION ALL SELECT \'cats\',count(*) FROM product_categories UNION ALL SELECT \'industries\',count(*) FROM industries UNION ALL SELECT \'resources\',count(*) FROM resource_items;"',
  'echo ====HOME====; curl -s http://127.0.0.1:3000/api/public/products | head -c 300',
];
conn.on('ready', () => {
  console.log('connected', HOST);
  (function run(i){
    if (i>=cmds.length){ conn.end(); process.exit(0); }
    conn.exec(cmds[i], (err, stream) => {
      if (err){ console.error('exec err', err.message); conn.end(); process.exit(1); }
      let out='';
      stream.on('close', (code) => { console.log(out.trim().slice(-1600)); run(i+1); })
        .on('data', d=>out+=d.toString())
        .stderr.on('data', d=>out+=d.toString());
    });
  })(0);
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
