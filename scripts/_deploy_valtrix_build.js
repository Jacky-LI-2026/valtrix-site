/**
 * VALTRIX 服务器 build + 重启 + 线上验证（2026-09-08）
 */
const ssh2 = require('D:/阀门网站/node_modules/ssh2');
const HOST = '47.57.241.85', USER = 'root', PASS = '__REMOVED_DEAD_PASSWORD__', PORT = 22;

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
  const conn = new ssh2.Client();
  await new Promise((res, rej) => {
    conn.on('ready', res);
    conn.on('error', rej);
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 });
  });

  console.log('1. 启动 build（后台）...');
  let out = await sshExec(conn, 'cd /var/www/valtrix && (nohup pnpm build > /tmp/valtrix_build_20260908.log 2>&1 &) && echo STARTED');
  console.log(out.trim());

  // 轮询 build 完成
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const chk = await sshExec(conn, 'ps aux | grep "next build" | grep -v grep | wc -l');
    const tail = await sshExec(conn, 'tail -3 /tmp/valtrix_build_20260908.log');
    console.log(`   [${(i + 1) * 15}s] 进程数=${chk.trim()}`);
    if (chk.trim() === '0') { console.log('   build 结束, tail:', tail.trim()); break; }
  }

  console.log('2. BUILD_ID + 重启...');
  out = await sshExec(conn, 'cat /var/www/valtrix/.next/BUILD_ID');
  console.log('   BUILD_ID =', out.trim());
  out = await sshExec(conn, 'cd /var/www/valtrix && (pm2 describe valtrix >/dev/null 2>&1 && pm2 restart valtrix || pm2 start "node server.js" --name valtrix) && sleep 5 && pm2 describe valtrix | grep -E "status|restarts"');
  console.log(out.trim());

  console.log('3. 线上验证...');
  out = await sshExec(conn, 'for u in "https://www.valvetrix.com/" "https://www.valvetrix.com/products" "https://www.valvetrix.com/industries" "https://www.valvetrix.com/services" "https://www.valvetrix.com/api/public/products"; do echo -n "$u -> "; curl -s -o /dev/null -w "%{http_code}" "$u"; echo; done');
  console.log(out.trim());

  console.log('4. 首页语言与内容抽查...');
  out = await sshExec(conn, 'curl -s https://www.valvetrix.com/ | grep -oE "<html lang=\"[a-z]+\"" | head -1; curl -s https://www.valvetrix.com/api/public/products | head -c 300; echo');
  console.log(out.trim());

  conn.end();
  console.log('完成');
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
