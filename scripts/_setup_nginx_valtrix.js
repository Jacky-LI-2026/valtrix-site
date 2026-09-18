/** VALTRIX Nginx 反代配置（80 → 127.0.0.1:3000，server_name www.valvetrix.com） */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const CONF = `/etc/nginx/sites-available/valtrix`;
const cmds = [
  'echo ====NGINX====; which nginx || (apt-get update -qq && apt-get install -y -qq nginx)',
  `cat > ${CONF} <<'NGEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name www.valvetrix.com valvetrix.com 47.57.241.85;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
NGEOF
ln -sf ${CONF} /etc/nginx/sites-enabled/valtrix
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx && echo NGINX_DONE`,
  'echo ====CHECK====; ss -tlnp | grep -E ":(80|443|3000)"; curl -s -o /dev/null -w "localhost:80 -> %{http_code}\\n" http://127.0.0.1/',
];
conn.on('ready', () => {
  console.log('connected', HOST);
  (function run(i){
    if (i>=cmds.length){ conn.end(); process.exit(0); }
    conn.exec(cmds[i], (err, stream) => {
      if (err){ console.error('exec err', err.message); conn.end(); process.exit(1); }
      let out='';
      stream.on('close', (code) => { console.log(out.trim().slice(-1400)); if (code!==0){ console.error('step fail', code); } run(i+1); })
        .on('data', d=>out+=d.toString())
        .stderr.on('data', d=>out+=d.toString());
    });
  })(0);
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
