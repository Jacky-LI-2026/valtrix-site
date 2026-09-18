/** 上传 hero 背景图到服务器 uploads/home */
const { Client } = require('ssh2');
const HOST = process.argv[2] || '47.57.241.85';
const conn = new Client();
const files = [
  ['D:/企业网站/_xinval_imgs/b_1.jpg', '/var/www/valtrix/public/uploads/home/hero-building.jpg'],
  ['D:/企业网站/_xinval_imgs/b_2.jpg', '/var/www/valtrix/public/uploads/home/hero-products.jpg'],
  ['D:/企业网站/_xinval_imgs/b_3.jpg', '/var/www/valtrix/public/uploads/home/hero-cleanroom.jpg'],
];
conn.on('ready', () => {
  console.log('connected', HOST);
  conn.exec('mkdir -p /var/www/valtrix/public/uploads/home', (e) => {
    if (e) { console.error(e.message); conn.end(); process.exit(1); }
    conn.sftp((err, sftp) => {
      if (err) { console.error('sftp err', err.message); conn.end(); process.exit(1); }
      (function next(i) {
        if (i >= files.length) { console.log('[upload done]'); conn.end(); process.exit(0); }
        sftp.fastPut(files[i][0], files[i][1], (e2) => {
          if (e2) { console.error('upload err', files[i][1], e2.message); conn.end(); process.exit(1); }
          console.log('ok', files[i][1]);
          next(i + 1);
        });
      })(0);
    });
  });
}).on('error', e => { console.error('ssh err', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', password: '__REMOVED_DEAD_PASSWORD__', readyTimeout: 30000, keepaliveInterval: 10000 });
