const { execSync } = require('child_process');
const fs = require('fs');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const REMOTE = '/root/deploy_tmp/cat_ml.sql';

function q(sql) {
  const f = 'D:/企业网站/_q_tmp.sql', o = 'D:/企业网站/_q_tmp_out.txt';
  fs.writeFileSync(f, sql, 'utf8');
  execSync(`"${PSQL}" "${DB}" -t -A -f "${f}" -o "${o}"`, { encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
  return fs.readFileSync(o, 'utf8');
}
function put(conn, local, remote) {
  return new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : sftp.fastPut(local, remote, e => e ? rej(e) : res())));
}
function sshExec(conn, cmd) {
  return new Promise((res, rej) => conn.exec(cmd, (e, s) => {
    if (e) return rej(e);
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += 'ERR:' + d);
    s.on('close', () => res(o));
  }));
}
(async () => {
  // 1. 生成本地 UPDATE SQL（从本地 DB 读 6 条 category 多语）
  const rows = q(`SELECT id, "nameJa", "nameKo", "nameFr", "nameAr" FROM product_categories ORDER BY id;`);
  const updates = [];
  for (const line of rows.split('\n').filter(Boolean)) {
    const [id, j, k, f, a] = line.split('|');
    const esc = v => "'" + String(v).replace(/'/g, "''") + "'";
    updates.push(`UPDATE product_categories SET "nameJa"=${esc(j)}, "nameKo"=${esc(k)}, "nameFr"=${esc(f)}, "nameAr"=${esc(a)} WHERE id=${id};`);
  }
  const sqlFile = 'D:/阀门网站/scripts/_cat_ml.sql';
  fs.writeFileSync(sqlFile, updates.join('\n'), 'utf8');

  // 2. 上传 + 服务器执行
  const conn = new ssh2.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 }); });
  await put(conn, sqlFile, REMOTE);
  const out = await sshExec(conn, [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    `psql "$DBURL" -f ${REMOTE}`,
    `psql "$DBURL" -t -A -c "SELECT id, \"nameJa\" FROM product_categories ORDER BY id;"`,
  ].join(' && '));
  console.log(out.slice(-800));
  conn.end();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
