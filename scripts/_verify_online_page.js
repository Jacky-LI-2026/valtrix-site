// 线上 /services 页面 HTML 渲染验证
const https = require('https');
['/services', '/services/technical-support', '/zh/services', '/ja/services'].forEach(p => {
  https.get('https://www.valvetrix.com' + p, { timeout: 30000 }, res => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => {
      const hasZh = b.includes('超高纯管阀件选型与系统方案') || b.includes('超高纯管阀件');
      const hasEn = b.includes('Ultra-high Pure Pipe Valve Components') || b.includes('Ultra-high purity pipe valve');
      console.log(p, 'HTTP', res.statusCode, 'len', b.length, '| zh:', hasZh, '| en:', hasEn);
    });
  }).on('error', e => console.log(p, 'ERROR', e.message));
});
