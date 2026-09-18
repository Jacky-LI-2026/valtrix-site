/**
 * 同步：图片更新 SQL + Hero/PageHero 代码改动 → 服务器 build + restart + 验证
 * 2026-09-08
 */
const { Client } = require('ssh2');
const conn = new Client();
const HOST = '47.57.241.85';
const SQL_LOCAL = 'D:/企业网站/_update_valtrix_imgs.sql';
const FILES = [
  ['D:/阀门网站/components/sections/Hero.tsx', '/var/www/valtrix/components/sections/Hero.tsx'],
  ['D:/阀门网站/lib/page-hero-config.tsx', '/var/www/valtrix/lib/page-hero-config.tsx'],
];

conn.on('ready', () => {
  console.log('connected');
  conn.sftp((err, sftp) => {
    if (err) { console.error('sftp err', err.message); return fail(); }
    // 1) 上传 SQL
    sftp.fastPut(SQL_LOCAL, '/tmp/_update_imgs.sql', (e1) => {
      if (e1) { console.error('sql upload err', e1.message); return fail(); }
      console.log('sql uploaded');
      // 2) 执行 SQL
      conn.exec('PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -f /tmp/_update_imgs.sql', (e2, s) => {
        if (e2) { console.error(e2.message); return fail(); }
        let o = '';
        s.on('close', (code) => {
          console.log('psql exit', code);
          console.log(o.trim());
          if (code !== 0) return fail();
          // 3) 上传代码文件
          (function next(i) {
            if (i >= FILES.length) { console.log('files uploaded, building...'); return build(); }
            sftp.fastPut(FILES[i][0], FILES[i][1], (e3) => {
              if (e3) { console.error('file upload err', FILES[i][1], e3.message); return fail(); }
              console.log('ok', FILES[i][1]);
              next(i + 1);
            });
          })(0);
        }).on('data', d => o += d).stderr.on('data', d => o += d);
      });
    });
  });
  function build() {
    conn.exec('cd /var/www/valtrix && pnpm build 2>&1 | tail -12', (e, s) => {
      if (e) { console.error(e.message); return fail(); }
      let o = '';
      s.on('close', (code) => {
        console.log('build exit', code);
        console.log(o.trim());
        if (code !== 0) return fail();
        conn.exec('pm2 restart valtrix --update-env && sleep 3 && curl -s -o /dev/null -w "health:%{http_code}\\n" https://www.valvetrix.com/ && curl -s https://www.valvetrix.com/api/public/home | head -c 200; echo', (e2, s2) => {
          let o2 = '';
          s2.on('close', (c2) => { console.log(o2.trim()); conn.end(); process.exit(0); })
            .on('data', d => o2 += d).stderr.on('data', d => o2 += d);
        });
      }).on('data', d => o += d).stderr.on('data', d => o += d);
    });
  }
  function fail() { conn.end(); process.exit(1); }
}).on('error', e => { console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000 });
