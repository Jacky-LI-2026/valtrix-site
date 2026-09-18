const { Client } = require('D:/阀门网站/node_modules/ssh2');
const conn = new Client();
const R = 'D:/阀门网站/';
const REMOTE_BASE = '/var/www/valtrix/';
const LOG = '/tmp/b_audit3.log';
const FILES = [
  'app/sitemap.ts', 'app/sitemap-images.xml/route.ts', 'lib/seo/baidu-push.ts',
  'app/services/[slug]/page.tsx', 'app/robots.ts', 'lib/seo.ts',
  'app/products/[tab]/[id]/page.tsx', 'app/news/[slug]/page.tsx', 'app/llms.txt/route.ts',
  'app/api/admin/email-marketing/route.ts', 'app/admin/settings/seo/page.tsx', 'app/admin/settings/site/page.tsx',
  'app/services/[slug]/ServiceDetailClient.tsx', 'app/about/[section]/AboutSectionClient.tsx',
  'app/careers/page.tsx', 'app/industries/page.tsx', 'app/careers/[slug]/JobDetailClient.tsx',
  'app/industries/[slug]/IndustryDetailClient.tsx', 'app/contact/page.tsx',
  'components/layout/Header.tsx', 'config/i18n.ts',
];
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.log('ERR sftp', err.message); conn.end(); return; }
    let i = 0;
    const next = () => {
      if (i >= FILES.length) {
        console.log('ALL PUT OK', FILES.length, 'files');
        const build = `pkill -9 -f "next bui[d]ld" 2>/dev/null; pkill -9 -f "pnpm bui[d]ld" 2>/dev/null; sleep 1; rm -f ${LOG}; nohup bash -c 'cd /var/www/valtrix && pnpm build > ${LOG} 2>&1; echo BUILD_EXIT=$? >> ${LOG}' >/dev/null 2>&1 &`;
        conn.exec(build, (e, st) => {
          if (e) { console.log('ERR launch', e.message); conn.end(); return; }
          st.on('close', () => { console.log('BUILD LAUNCHED log=' + LOG); conn.end(); }).on('data', () => {}).stderr.on('data', () => {});
        });
        return;
      }
      const f = FILES[i++];
      const local = R + f;
      const remote = REMOTE_BASE + f;
      sftp.fastPut(local, remote, (e2) => {
        if (e2) { console.log('ERR put', f, e2.message); conn.end(); return; }
        console.log('PUT', f);
        next();
      });
    };
    next();
  });
}).connect({ host: '47.57.241.85', port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', keepaliveInterval: 10000, keepaliveCountMax: 12 });
