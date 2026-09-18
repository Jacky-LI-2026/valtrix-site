/**
 * VALTRIX services 表同步服务器（2026-09-08）
 * 本地 pg_dump services → 清理 PG17 行 → SSH 上传 → 服务器 TRUNCATE + 导入 → 验证
 */
const { execSync } = require('child_process');
const fs = require('fs');
const ssh2 = require('D:/阀门网站/node_modules/ssh2');

const PSQL = 'D:/企业网站/_pgsql/extracted/pgsql/bin/psql.exe';
const PGDUMP = 'D:/企业网站/_pgsql/extracted/pgsql/bin/pg_dump.exe';
const LOCAL_DB = 'postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve';
const TMP = 'D:/阀门网站/scripts/_content_sync';
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;
const REMOTE = '/root/deploy_tmp/valtrix_services.sql';

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
  // 1. 本地 dump services（--data-only 只导出 INSERT，避免 DDL 冲突）
  console.log('1. pg_dump 本地 services...');
  run(`"${PGDUMP}" "${LOCAL_DB}" --data-only --column-inserts --no-owner --no-privileges -t services -f "${TMP}/services_dump.sql"`);
  let dump = fs.readFileSync(`${TMP}/services_dump.sql`, 'utf8');
  dump = dump.split('\n').filter(l => !/\\restrict/.test(l) && !/transaction_timeout/.test(l) && !/^SET /.test(l)).join('\n');
  fs.writeFileSync(`${TMP}/services_dump_clean.sql`, dump, 'utf8');
  console.log('   dump 大小:', (dump.length / 1024).toFixed(1), 'KB');
  console.log('   INSERT 条数:', (dump.match(/INSERT INTO public\.services/g) || []).length);
  console.log('   含 CREATE TABLE:', /CREATE TABLE/.test(dump));

  // 2. SSH 上传
  console.log('2. SSH 上传...');
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', () => {
      sshExec(conn, 'mkdir -p /root/deploy_tmp').then(() => put(conn, `${TMP}/services_dump_clean.sql`, REMOTE)).then(res).catch(rej);
    });
    conn.on('error', rej);
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 });
  });

  // 3. 服务器先查表结构 + 现有数据
  console.log('3. 服务器现状...');
  const structCmd = [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    'psql "$DBURL" -c "\\d services" 2>&1 | head -20',
    'psql "$DBURL" -t -c "SELECT count(*) FROM services;"',
  ].join(' && ');
  console.log((await sshExec(conn, structCmd)).slice(-1500));

  // 4. 服务器 TRUNCATE + 导入
  console.log('4. 服务器 TRUNCATE + 导入...');
  const importCmd = [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    `psql "$DBURL" -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE services CASCADE;"`,
    `psql "$DBURL" -v ON_ERROR_STOP=1 -c "SET session_replication_role=replica;" -f ${REMOTE} 2>&1 | tail -20`,
    `psql "$DBURL" -v ON_ERROR_STOP=1 -c "SET session_replication_role=DEFAULT;"`,
  ].join(' && ');
  const out = await sshExec(conn, importCmd);
  console.log(out.slice(-2000));

  // 5. 服务器验证
  console.log('5. 服务器验证...');
  const verifyCmd = [
    'cd /var/www/valtrix',
    'DBURL=$(grep -E \'^DATABASE_URL=\' .env | head -1 | cut -d= -f2- | tr -d \'"\' | sed \'s/\\?schema=[^&]*//\')',
    `psql "$DBURL" -t -c "SELECT 'count='||count(*) FROM services;"`,
    `psql "$DBURL" -c "SELECT id, title, \\"titleEn\\", \\"subtitleEn\\" FROM services ORDER BY id;"`,
  ].join(' && ');
  console.log((await sshExec(conn, verifyCmd)).slice(-2000));
  conn.end();
  console.log('完成');
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
