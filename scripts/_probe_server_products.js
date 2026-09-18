// Probe server DB: list product slugs + model + summary head to detect misalignment
const fs = require('fs');
const path = require('path');
const { Client } = require('D:/阀门网站/node_modules/ssh2');
const HOST = '47.57.241.85';
const conn = new Client();
function run(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      const t = setTimeout(() => { stream.close(); resolve({ code: -1, out: out + '\n[TIMEOUT]' }); }, timeout);
      stream.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
      stream.on('data', (d) => (out += d.toString()));
      stream.stderr.on('data', (d) => (out += d.toString()));
    });
  });
}
(async () => {
  await new Promise((res, rej) => conn.on('ready', res).on('error', rej).connect({
    host: HOST, username: 'root', password: '__REMOVED_DEAD_PASSWORD__',
    keepaliveInterval: 10000, keepaliveCountMax: 12, readyTimeout: 30000,
  }));
  const probe = `cd /var/www/valtrix && node -e "
const {PrismaClient}=require('/var/www/valtrix/lib/generated/prisma');
const p=new PrismaClient();
(async()=>{
  const prods=await p.product.findMany({select:{id:true,slug:true,model:true,name:true,summary:true},orderBy:{id:'asc'}});
  console.log('COUNT='+prods.length);
  prods.forEach(x=>console.log(x.id+'|'+x.slug+'|'+x.model+'|'+(x.name||'').slice(0,30)+'|'+(x.summary||'').replace(/\\s/g,'').slice(0,40)));
  await p.\\$disconnect();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
"`;
  const r = await run(probe, 120000);
  console.log(r.out);
  conn.end();
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
