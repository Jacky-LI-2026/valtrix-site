const { execSync } = require('child_process');
const fs = require('fs');
const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
fs.writeFileSync('D:/阀门网站/scripts/_q_seo.sql', 'SELECT id, "siteName", COALESCE("defaultTitle",\'\') AS t, COALESCE("defaultDesc",\'\') AS d, COALESCE(email,\'\') AS e, COALESCE(phone,\'\') AS p FROM seo_config ORDER BY id LIMIT 3;\n');
execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_q_seo.sql -o D:/阀门网站/scripts/_q_seo.out`);
console.log(fs.readFileSync('D:/阀门网站/scripts/_q_seo.out', 'utf8'));
