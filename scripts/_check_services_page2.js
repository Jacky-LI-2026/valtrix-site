// 深入检查 /services 页面渲染结构
const https = require('https');
https.get('https://www.valvetrix.com/services', { timeout: 30000 }, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    // 找 技术支持 上下文
    for (const key of ['技术支持', 'custom-manufacturing']) {
      const i = b.indexOf(key);
      console.log('=== ' + key + ' @' + i + ' ===');
      if (i > -1) console.log(b.slice(Math.max(0, i - 400), i + 300).replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').slice(0, 600));
      console.log();
    }
    // 检查是否含所有 slug 链接（列表 item 链接）
    const slugs = ['technical-support', 'custom-manufacturing', 'maintenance-service', 'training-consulting'];
    let pos = 0;
    for (const s of slugs) {
      let cnt = 0;
      while ((pos = b.indexOf(s, pos)) > -1) { cnt++; pos += s.length; }
      console.log(s, 'occurrences:', cnt);
    }
  });
}).on('error', e => console.log('ERROR', e.message));
