const { Client } = require('D:/阀门网站/node_modules/ssh2');
function q(name, host, dir) {
  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(`echo "== ${name}"; grep -c "menuProfileDesc" "${dir}/components/layout/Header.tsx"; grep -c "menuProfileDesc" "${dir}/config/i18n.ts"; grep -n "menuProfileDesc" "${dir}/components/layout/Header.tsx" | head -2`, (e, st) => {
        if (e) { console.log(name, 'ERR', e.message); conn.end(); resolve(); return; }
        let o = '';
        st.on('close', () => { console.log(o.trim().slice(0, 700)); conn.end(); resolve(); })
          .on('data', d => o += d).stderr.on('data', d => o += d);
      });
    }).connect({ host, port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
    setTimeout(() => { try { conn.end(); } catch (e) {} resolve(); }, 30000);
  });
}
(async () => {
  await q('VALTRIX', '47.57.241.85', '/var/www/valtrix');
  await q('左文', '8.130.65.182', '/var/www/zuowen');
})();
