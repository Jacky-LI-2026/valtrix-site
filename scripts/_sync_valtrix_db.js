/** VALTRIX 数据库全量同步：本地上传 SQL → 服务器导入 → 序列修复 */
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const SQL = process.argv[3] || path.join(__dirname, '..', '..', '企业网站', '_valtrix_data.sql');
const conn = new Client();

conn.on('ready', () => {
  console.log('connected', HOST);
  // 1. sftp 上传
  conn.sftp((err, sftp) => {
    if (err) { console.error('sftp err', err.message); conn.end(); process.exit(1); }
    sftp.fastPut(SQL, '/tmp/valtrix_data.sql', (err2) => {
      if (err2) { console.error('upload err', err2.message); conn.end(); process.exit(1); }
      console.log('uploaded', fs.statSync(SQL).size, 'bytes');
      // 2. 清表 + 导入 + 序列修复
      const fixSeq = `DO $$ DECLARE r RECORD; BEGIN
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations') LOOP
          EXECUTE format('SELECT setval(pg_get_serial_sequence(''%I'',''id''), COALESCE((SELECT MAX(id) FROM %I), 1))', r.tablename, r.tablename);
        END LOOP;
      END $$;`;
      const cmds = [
        `PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -v ON_ERROR_STOP=0 -f /tmp/valtrix_data.sql 2>&1 | tail -5; echo IMPORT_DONE`,
        `PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -c "${fixSeq.replace(/"/g, '\\"')}" 2>&1 | tail -2; echo SEQ_DONE`,
        `PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -t -c "SELECT 'products',count(*) FROM products UNION ALL SELECT 'specs',count(*) FROM product_specs UNION ALL SELECT 'tabs',count(*) FROM product_tabs UNION ALL SELECT 'cats',count(*) FROM product_categories UNION ALL SELECT 'industries',count(*) FROM industries UNION ALL SELECT 'resources',count(*) FROM resource_items UNION ALL SELECT 'users',count(*) FROM users;"`,
      ];
      (function run(i){
        if (i>=cmds.length){ console.log('\\n[sync done]'); conn.end(); process.exit(0); }
        conn.exec(cmds[i], (err3, stream) => {
          if (err3){ console.error('exec err', err3.message); fail(); return; }
          let out='';
          stream.on('close', (code) => { console.log(out.trim().slice(-1400)); run(i+1); })
            .on('data', d=>out+=d.toString())
            .stderr.on('data', d=>out+=d.toString());
        });
      })(0);
    });
  });
  function fail(){ conn.end(); process.exit(1); }
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
