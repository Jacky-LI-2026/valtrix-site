/** VALTRIX 图标同步 + 序列修复 + 重新构建 */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const seqSql = `DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations')
  LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, ''id''), GREATEST(COALESCE((SELECT MAX(id) FROM %I), 1), 1), true)', r.tablename, r.tablename);
  END LOOP;
END $$;`;

conn.on('ready', () => {
  console.log('connected', HOST);
  conn.sftp((err, sftp) => {
    if (err) { console.error('sftp err', err.message); conn.end(); process.exit(1); }
    sftp.fastPut('D:/阀门网站/app/icon.png', '/var/www/valtrix/app/icon.png', (e1) => {
      if (e1) { console.error('icon upload err', e1.message); conn.end(); process.exit(1); }
      console.log('icon.png uploaded');
      sftp.fastPut('D:/阀门网站/app/favicon.png', '/var/www/valtrix/app/favicon.png', (e2) => {
        if (e2) { console.error('favicon upload err', e2.message); conn.end(); process.exit(1); }
        console.log('favicon.png uploaded');
        sftp.writeFile('/tmp/fix_seq.sql', seqSql, (e3) => {
          if (e3) { console.error('seq sql err', e3.message); conn.end(); process.exit(1); }
          console.log('seq sql uploaded');
          const cmds = [
            `PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -f /tmp/fix_seq.sql 2>&1 | tail -2; echo SEQ_DONE`,
            `cd /var/www/valtrix && pnpm build 2>&1 | tail -8 && echo BUILD_DONE`,
            `pm2 restart valtrix --update-env && sleep 3 && pm2 status valtrix | grep -E "valtrix|online" | head -3`,
            `curl -s -o /dev/null -w "/ -> %{http_code}\\n" http://127.0.0.1:3000/; curl -s http://127.0.0.1:3000/api/public/products | head -c 120; echo; ls -l app/icon.png app/favicon.png | awk '{print $NF, $5}'`,
          ];
          (function run(i){
            if (i>=cmds.length){ console.log('\\n[all done]'); conn.end(); process.exit(0); }
            conn.exec(cmds[i], (e4, stream) => {
              if (e4){ console.error('exec err', e4.message); conn.end(); process.exit(1); }
              let out='';
              stream.on('close', (code) => { console.log(out.trim().slice(-1300)); run(i+1); })
                .on('data', d=>out+=d.toString())
                .stderr.on('data', d=>out+=d.toString());
            });
          })(0);
        });
      });
    });
  });
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:40000, keepaliveInterval:10000, keepaliveCountMax:20 });
