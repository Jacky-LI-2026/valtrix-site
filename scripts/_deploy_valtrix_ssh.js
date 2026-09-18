/**
 * VALTRIX 一键 SSH 部署脚本（等新公网 IP 换好后运行）
 * 用法: node scripts/_deploy_valtrix_ssh.js <host>
 * 前置: 部署包已通过 OSS/Cloud Shell scp 到服务器 /var/www/valtrix/valtrix-src.zip
 * 服务器已装: node / pnpm / pm2 / PostgreSQL(库 zuowen_valve 已建, postgres 密码 __REMOVED_DEAD_PASSWORD__)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('ssh2');

const HOST = process.argv[2];
if (!HOST) { console.error('用法: node scripts/_deploy_valtrix_ssh.js <host>'); process.exit(1); }
const PORT = 22;
const USER = 'root';
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DIR = '/var/www/valtrix';

// 读本地 .env / .env.local 生成服务器配置
function readEnv(file) {
  const p = path.join(__dirname, '..', file);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}
function envValue(file, key) {
  const m = readEnv(file).match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
}

const nextauthSecret = envValue('.env', 'NEXTAUTH_SECRET') || crypto.randomBytes(32).toString('hex');

const envFile = [
  'DATABASE_URL="postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve?schema=public"',
  'NEXTAUTH_SECRET=' + nextauthSecret,
  'NEXTAUTH_URL=http://localhost:3000',
  ''
].join('\n');

const envLocalFile = (() => {
  const keys = ['BAIDU_TRANSLATE_APPID', 'BAIDU_TRANSLATE_KEY', 'NIU_API_KEY', 'NIU_APP_ID'];
  const lines = [];
  for (const k of keys) {
    const v = envValue('.env.local', k);
    if (v) lines.push(k + '=' + v);
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
})();

const steps = [
  { name: '连接检查', cmd: `echo OK_SSH; ls -l ${DIR}/valtrix-src.zip` },
  { name: '解压部署包', cmd: `cd ${DIR} && (unzip -o -q valtrix-src.zip 2>/dev/null || python3 -c "import zipfile; zipfile.ZipFile('valtrix-src.zip').extractall('.')") && rm -f valtrix-src.zip && ls | head -20 && echo EXTRACT_DONE` },
  { name: '写入 .env', cmd: `cat > ${DIR}/.env <<'ENVEOF'\n${envFile}ENVEOF\ncat > ${DIR}/.env.local <<'ENVEOF'\n${envLocalFile}ENVEOF\ncat ${DIR}/.env | grep -v SECRET && echo ENV_DONE` },
  { name: '安装依赖', cmd: `cd ${DIR} && (ls node_modules >/dev/null 2>&1 || pnpm install --no-frozen-lockfile) && echo INSTALL_DONE` },
  { name: 'Prisma 同步', cmd: `cd ${DIR} && npx prisma generate && npx prisma db push && echo PRISMA_DONE` },
  { name: '生产构建', cmd: `cd ${DIR} && pnpm build 2>&1 | tail -15 && echo BUILD_DONE` },
  { name: 'pm2 启动', cmd: `cd ${DIR} && if pm2 describe valtrix >/dev/null 2>&1; then pm2 restart valtrix --update-env; else NODE_ENV=production pm2 start "node server.js" --name valtrix && pm2 save; fi; sleep 3; pm2 status valtrix` },
  { name: '健康检查', cmd: `sleep 2; echo "HTTP: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)"; curl -s -o /dev/null -w '/ -> %{http_code}\n' http://127.0.0.1:3000/` },
];

const conn = new Client();
conn.on('ready', () => {
  console.log(`[连接成功] ${USER}@${HOST}:${PORT}`);
  runStep(0);
}).on('error', (e) => { console.error('[SSH错误]', e.message); process.exit(1); });

function runStep(i) {
  if (i >= steps.length) { console.log('\n[全部完成]'); conn.end(); process.exit(0); }
  const s = steps[i];
  console.log(`\n===== [${i + 1}/${steps.length}] ${s.name} =====`);
  conn.exec(s.cmd, { pty: false }, (err, stream) => {
    if (err) { console.error('exec error:', err.message); fail(i); return; }
    let out = '';
    stream.on('close', (code) => {
      out = out.trim();
      if (out) console.log(out.slice(-1500));
      if (code !== 0) { console.error(`[步骤失败] exit=${code}`); fail(i); return; }
      runStep(i + 1);
    }).on('data', (d) => { out += d.toString(); })
      .stderr.on('data', (d) => { out += d.toString(); });
    // 长命令兜底超时
    setTimeout(() => { try { stream.close(); } catch (e) {} }, 600000);
  });
}
function fail(i) { console.error(`[部署中止] 步骤 ${i + 1} 失败`); conn.end(); process.exit(1); }

conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 30000, keepaliveInterval: 10000, keepaliveCountMax: 12 });
