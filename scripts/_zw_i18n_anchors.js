const fs = require('fs');
const s = fs.readFileSync('D:/企业网站/config/i18n.ts', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (/^\s*notFound:/.test(l) || /^\s*ourHonors:/.test(l)) console.log((i + 1) + ': ' + l.trim());
});
