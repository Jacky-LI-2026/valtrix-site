// 提取 /services 页面 SEO meta 与标题
const https = require('https');
https.get('https://www.valvetrix.com/services', { timeout: 30000 }, r => {
  let b = '';
  r.on('data', d => b += d);
  r.on('end', () => {
    const m = b.match(/<meta property="og:description" content="([^"]*)"/);
    console.log('og:description:', m ? m[1].replace(/&amp;/g, '&') : 'NOT FOUND');
    const t = b.match(/<title>([^<]*)<\/title>/);
    console.log('title:', t ? t[1] : 'NOT FOUND');
    // 服务相关关键词检查
    for (const k of ['技术支持', '定制加工', '维护与备件', '培训与咨询', '超高纯']) {
      console.log('contains', k, ':', b.includes(k));
    }
  });
}).on('error', e => console.log('ERR', e.message));
