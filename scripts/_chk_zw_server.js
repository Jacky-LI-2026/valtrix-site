const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const checks = [
    ['lib/seo-metadata.ts', 'defaultLocale'],
    ['app/about/[section]/AboutSectionClient.tsx', 'heading" + sfx'],
    ['app/about/[section]/AboutSectionClient.tsx', 'heading${sfx}'],
    ['components/layout/Footer.tsx', 'String(contactData?.phone'],
    ['app/services/[slug]/ServiceDetailClient.tsx', 'typeof feature === "string"'],
    ['app/products/[tab]/[id]/ProductDetailClient.tsx', 'String(contactData?.phone'],
  ];
  let cmd = 'cd /var/www/zuowen && ';
  const greps = checks.map(([f, pat]) => `(grep -l '${pat}' '${f}' >/dev/null 2>&1 && echo "OK ${f} ~ ${pat}" || echo "MISS ${f} ~ ${pat}")`);
  cmd += greps.join('; ') + '; echo ---; pm2 pid zuowen-web; tail -1 /root/.pm2/logs/zuowen-web-out.log 2>/dev/null';
  conn.exec(cmd, (err, st) => {
    if (err) { console.log('ERR', err.message); conn.end(); return; }
    let out = '';
    st.on('close', () => { console.log(out.trim().slice(0, 2500)); conn.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).connect({ host: '8.130.65.182', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
