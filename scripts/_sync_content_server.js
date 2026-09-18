/**
 * VALTRIX 内容同步服务器（2026-09-08）
 * 本地 pg_dump products/industries/services → 清理 PG17 行 → SSH 上传 → 服务器 TRUNCATE + 导入 → 验证
 */
const { execSync } = require('child_process');
const fs = require('fs');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const PGDUMP = 'D:/企业网站/_pgsql/extracted/pgsql/bin/pg_dump.exe';
const LOCAL_DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const TMP = 'D:/阀门网站/scripts/_content_sync';
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const REMOTE = '/root/deploy_tmp/valtrix_content.sql';

function run(cmd) {
  execSync(cmd, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
function put(conn, local, remote) {
  return new Promise((res, rej) => {
    conn.sftp((err, sftp) => {
      if (err) return rej(err);
      sftp.fastPut(local, remote, e => e ? rej(e) : res());
    });
  });
}
function sshExec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += 'ERR:' + d);
      s.on('close', () => res(o));
    });
  });
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  // 1. 本地 dump 3 表（column-inserts）
  console.log('1. pg_dump 本地...');
  run(`"${PGDUMP}" "${LOCAL_DB}" --column-inserts --no-owner --no-privileges -t products -t industries -t services -f "${TMP}/dump.sql"`);
  let dump = fs.readFileSync(`${TMP}/dump.sql`, 'utf8');
  // 2. 清理 PG17 专属行
  dump = dump.split('\n').filter(l => !/\\restrict/.test(l) && !/transaction_timeout/.test(l) && !/^SET /.test(l)).join('\n');
  fs.writeFileSync(`${TMP}/dump_clean.sql`, dump, 'utf8');
  console.log('   dump 大小:', (dump.length / 1024 / 1024).toFixed(2), 'MB');

  // 3. SSH 上传
  console.log('2. SSH 上传...');
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', () => {
      sshExec(conn, 'mkdir -p /root/deploy_tmp').then(() => put(conn, `${TMP}/dump_clean.sql`, REMOTE)).then(res).catch(rej);
    });
    conn.on('error', rej);
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 });
  });

  // 4. 服务器 TRUNCATE + 导入
  console.log('3. 服务器导入...');
  const remoteCmd = [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    `psql "$DBURL" -c "TRUNCATE TABLE products CASCADE; TRUNCATE TABLE industries CASCADE; TRUNCATE TABLE services CASCADE;"`,
    `psql "$DBURL" -c "SET session_replication_role=replica;" -f ${REMOTE}`,
    `psql "$DBURL" -t -c "SELECT 'products='||count(*) FROM products; SELECT 'industries='||count(*) FROM industries; SELECT 'services='||count(*) FROM services;"`,
  ].join(' && ');
  const out = await sshExec(conn, remoteCmd);
  console.log(out.slice(-800));
  conn.end();
  console.log('完成');
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
