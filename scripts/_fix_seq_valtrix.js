/** VALTRIX 序列修复：生成 setval SQL 上传执行 */
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
    sftp.writeFile('/tmp/fix_seq.sql', seqSql, (e2) => {
      if (e2) { console.error('write err', e2.message); conn.end(); process.exit(1); }
      console.log('seq sql uploaded');
      conn.exec(`PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -f /tmp/fix_seq.sql 2>&1 | tail -3; echo FIX_DONE; PGPASSWORD=__REMOVED_DEAD_PASSWORD__ psql -h 127.0.0.1 -U postgres -d zuowen_valve -t -c "SELECT nextval('products_id_seq'), nextval('product_specs_id_seq');"`, (e3, stream) => {
        if (e3){ console.error('exec err', e3.message); conn.end(); process.exit(1); }
        let out='';
        stream.on('close', () => { console.log(out.trim().slice(-600)); conn.end(); process.exit(0); })
          .on('data', d=>out+=d.toString())
          .stderr.on('data', d=>out+=d.toString());
      });
    });
  });
}).on('error', e=>{ console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host:HOST, port:22, username:'root', password:'__REMOVED_DEAD_PASSWORD__', readyTimeout:30000, keepaliveInterval:10000 });
