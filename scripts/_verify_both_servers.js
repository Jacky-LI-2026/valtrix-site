const { Client } = require('D:/阀门网站/node_modules/ssh2');
function checkServer(name, host, dir, checks) {
  return new Promise((resolve) => {
    const conn = new Client();
    const cmds = checks.map(([f, pat]) => `(grep -F "${pat}" "${dir}/${f}" >/dev/null 2>&1 && echo "OK: ${f} ~ ${pat.slice(0, 24)}" || echo "MISS: ${f} ~ ${pat.slice(0, 24)}")`);
    conn.on('ready', () => {
      conn.exec('echo "===== ' + name + ' ====="; ' + cmds.join('; '), (e, st) => {
        if (e) { console.log(name, 'ERR', e.message); conn.end(); resolve(); return; }
        let o = '';
        st.on('close', () => { console.log(o.trim().slice(0, 3500)); conn.end(); resolve(); })
          .on('data', d => o += d).stderr.on('data', d => o += d);
      });
    }).connect({ host, port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
    setTimeout(() => { try { conn.end(); } catch (e) {} resolve(); }, 40000);
  });
}
(async () => {
  await checkServer('VALTRIX 47.57.241.85', '47.57.241.85', '/var/www/valtrix', [
    ['app/sitemap.ts', 'valvetrix.com'],
    ['app/services/[slug]/ServiceDetailClient.tsx', '{ ...x }'],
    ['app/services/[slug]/ServiceDetailClient.tsx', 'serviceNotFound'],
    ['app/contact/page.tsx', 'item.sub !== item.label'],
    ['app/contact/page.tsx', 'inline-block'],
    ['components/layout/Header.tsx', 'menuProfileDesc)'],
    ['config/i18n.ts', 'serviceNotFound'],
    ['config/i18n.ts', 'menuProfileDesc:'],
    ['app/about/[section]/AboutSectionClient.tsx', 'heading${sfx}'],
  ]);
  await checkServer('左文 8.130.65.182', '8.130.65.182', '/var/www/zuowen', [
    ['app/sitemap.ts', 'zuowentech.com'],
    ['app/services/[slug]/ServiceDetailClient.tsx', '{ ...x }'],
    ['app/services/[slug]/ServiceDetailClient.tsx', 'serviceNotFound'],
    ['app/services/[slug]/ServiceDetailClient.tsx', 'typeof feature'],
    ['app/contact/page.tsx', 'item.sub !== item.label'],
    ['app/contact/page.tsx', 'inline-block'],
    ['components/layout/Header.tsx', 'menuProfileDesc)'],
    ['config/i18n.ts', 'serviceNotFound'],
    ['config/i18n.ts', 'menuProfileDesc:'],
    ['app/about/[section]/AboutSectionClient.tsx', 'heading${sfx}'],
    ['app/about/[section]/AboutSectionClient.tsx', 'certifications.filter'],
    ['components/layout/Footer.tsx', 'String(contactData?.phone'],
    ['lib/seo-metadata.ts', 'defaultLocale'],
  ]);
})();
