const https = require('https');
const fs = require('fs');
const imgs = {
  'fab-outside.jpg': 'https://aka.doubaocdn.com/s/gjL2NzSSl2',
};
const dir = 'D:/阀门网站/scripts/_img_probe/';
function dl(url, depth = 0) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.valvetrix.com/' } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && depth < 5) { r.resume(); return res(dl(r.headers.location, depth + 1)); }
      if (r.statusCode >= 400) return rej(new Error('HTTP ' + r.statusCode));
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => res(Buffer.concat(chunks)));
    });
    req.on('error', rej);
  });
}
(async () => {
  for (const [name, url] of Object.entries(imgs)) {
    const buf = await dl(url);
    fs.writeFileSync(dir + name, buf);
    console.log(name, buf.length, 'bytes');
  }
})();
