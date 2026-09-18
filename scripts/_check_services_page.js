// 检查 /services 列表页实际渲染内容
const https = require('https');
https.get('https://www.valvetrix.com/services', { timeout: 30000 }, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    const checks = ['技术支持', '定制加工', '维护与备件', '培训与咨询', '超高纯管阀件', 'technical-support', 'custom-manufacturing', 'maintenance-service', 'training-consulting'];
    for (const c of checks) console.log('contains', JSON.stringify(c), ':', b.includes(c));
    // 提取服务区块附近文本
    const idx = b.indexOf('services');
    console.log('--- sample around services ---');
    const i2 = b.indexOf('custom-manufacturing');
    if (i2 > -1) console.log(b.slice(Math.max(0, i2 - 500), i2 + 200).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500));
  });
}).on('error', e => console.log('ERROR', e.message));
