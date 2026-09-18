const { execSync } = require('child_process');
const fs = require('fs');
const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
const cfg = {
  '/about':      { backgroundImage: '/uploads/home/hero-cleanroom.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/industries': { backgroundImage: '/uploads/home/hero-cleanroom.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/news':       { backgroundImage: '/uploads/home/hero-building.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/services':   { backgroundImage: '/uploads/home/hero-products.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/products':   { backgroundImage: '/uploads/home/hero-products.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/careers':    { backgroundImage: '/uploads/home/hero-building.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/contact':    { backgroundImage: '/uploads/home/hero-building.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
  '/resources':  { backgroundImage: '/uploads/home/hero-products.jpg', overlayColor: '#0a0a0a', overlayOpacity: 0.35, gradientEnabled: false, gradientColor2: '#1a1a2e', patternEnabled: true },
};
const sql = `DELETE FROM site_config WHERE "configKey"='page_hero_config';\nINSERT INTO site_config ("configKey","configValue","updatedAt") VALUES ('page_hero_config', '${JSON.stringify(cfg)}'::jsonb, NOW());\n`;
fs.writeFileSync('D:/阀门网站/scripts/_set_hero_cfg.sql', sql, 'utf8');
// 本地执行
execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_set_hero_cfg.sql -o D:/阀门网站/scripts/_set_hero_cfg.out`);
console.log(fs.readFileSync('D:/阀门网站/scripts/_set_hero_cfg.out', 'utf8') || 'local OK');
// 验证本地
fs.writeFileSync('D:/阀门网站/scripts/_q_vt.sql', "SELECT \"configKey\", jsonb_array_length(\"configValue\"::jsonb) FROM site_config WHERE \"configKey\"='page_hero_config';\nSELECT COUNT(*) FROM (SELECT jsonb_object_keys(\"configValue\") FROM site_config WHERE \"configKey\"='page_hero_config') t;\n");
execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_q_vt.sql -o D:/阀门网站/scripts/_q_vt.out`);
console.log(fs.readFileSync('D:/阀门网站/scripts/_q_vt.out', 'utf8'));
