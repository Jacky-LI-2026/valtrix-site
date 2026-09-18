/** VALTRIX 部署续跑：检查依赖/.env → install → prisma → build → pm2 → 健康检查 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('ssh2');

const HOST = process.argv[2];
if (!HOST) { console.error('usage: node scripts/_deploy_valtrix_continue.js <host>'); process.exit(1); }
const DIR = '/var/www/valtrix';

function envValue(file, key) {
  const p = path.join(__dirname, '..', file);
  if (!fs.existsSync(p)) return '';
  const m = fs.readFileSync(p, 'utf8').match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
}
const nextauthSecret = envValue('.env', 'NEXTAUTH_SECRET') || crypto.randomBytes(32).toString('hex');
const envFile = [
  'DATABASE_URL="postgresql://postgres:__REMOVED_DEAD_PASSWORD__@localhost:5432/zuowen_valve?schema=public"',
  'NEXTAUTH_SECRET=' + nextauthSecret,
  'NEXTAUTH_URL=http://localhost:3000',
  ''
].join('\n');
const keys = ['BAIDU_TRANSLATE_APPID', 'BAIDU_TRANSLATE_KEY', 'NIU_API_KEY', 'NIU_APP_ID'];
const envLocalLines = [];
for (const k of keys) { const v = envValue('.env.local', k); if (v) envLocalLines.push(k + '=' + v); }
const envLocalFile = envLocalLines.join('\n') + (envLocalLines.length ? '\n' : '');

const steps = [
  { name: '状态检查', cmd: `cd ${DIR} && echo "node_modules: $(ls -d node_modules 2>/dev/null || echo NO)"; echo ".env: $(ls .env 2>/dev/null || echo NO)"; ls package.json server.js 2>&1` },
  { name: '写入 .env', cmd: `cat > ${DIR}/.env <<'ENVEOF'\n${envFile}ENVEOF\ncat > ${DIR}/.env.local <<'ENVEOF'\n${envLocalFile}ENVEOF\ngrep -c . ${DIR}/.env && echo ENV_DONE` },
  { name: '安装依赖', cmd: `cd ${DIR} && printf 'registry=https://registry.npmmirror.com\\n' > .npmrc && rm -rf node_modules && pnpm install --no-frozen-lockfile && echo INSTALL_DONE && ls node_modules/.bin/prisma` },
  { name: 'Prisma 同步', cmd: `cd ${DIR} && ls node_modules/.bin/prisma && pnpm exec prisma generate && pnpm exec prisma db push && echo PRISMA_DONE` },
  { name: '生产构建', cmd: `cd ${DIR} && pnpm build 2>&1 | tail -12 && echo BUILD_DONE` },
  { name: 'pm2 启动', cmd: `cd ${DIR} && if pm2 describe valtrix >/dev/null 2>&1; then pm2 restart valtrix --update-env; else NODE_ENV=production pm2 start "node server.js" --name valtrix && pm2 save; fi; sleep 3; pm2 status valtrix` },
  { name: '健康检查', cmd: `sleep 2; for p in / /products /news /admin; do echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000$p)"; done` },
];

const conn = new Client();
conn.on('ready', () => { console.log(`[连接成功] ${HOST}`); runStep(0); })
  .on('error', e => { console.error('[SSH错误]', e.message); process.exit(1); });

function runStep(i) {
  if (i >= steps.length) { console.log('\n[全部完成]'); conn.end(); process.exit(0); }
  const s = steps[i];
  console.log(`\n===== [${i + 1}/${steps.length}] ${s.name} =====`);
  conn.exec(s.cmd, (err, stream) => {
    if (err) { console.error('exec error:', err.message); fail(i); return; }
    let out = '';
    stream.on('close', code => {
      out = out.trim();
      if (out) console.log(out.slice(-1600));
      if (code !== 0) { console.error(`[步骤失败] exit=${code}`); fail(i); return; }
      runStep(i + 1);
    }).on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
    setTimeout(() => { try { stream.close(); } catch (e) {} }, 900000);
  });
}
function fail(i) { console.error(`[部署中止] 步骤 ${i + 1} 失败`); conn.end(); process.exit(1); }

conn.connect({ host: HOST, port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000, keepaliveCountMax: 12 });
