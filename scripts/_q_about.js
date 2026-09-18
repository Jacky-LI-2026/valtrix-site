const { execSync } = require('child_process');
const fs = require('fs');
const PGBIN = 'D:/企业网站/_pgsql/extracted/pgsql/bin';
const sql = "SELECT slug, COALESCE((content::text)::jsonb->0->>'heading','') AS zh_h0, COALESCE((content::text)::jsonb->0->>'lang','') AS zh_lang, COALESCE(\"contentEn\"::text,'') AS en_raw FROM about_sections ORDER BY id;\n";
fs.writeFileSync('D:/阀门网站/scripts/_q_about.sql', sql);
try {
  execSync(`"${PGBIN}/psql.exe" "postgresql://postgres:__REMOVED_DEAD_PASSWORD__localhost:5432/zuowen_valve" -t -f D:/阀门网站/scripts/_q_about.sql -o D:/阀门网站/scripts/_q_about.out`);
  console.log(fs.readFileSync('D:/阀门网站/scripts/_q_about.out', 'utf8').slice(0, 3000));
} catch (e) { console.log('ERR', e.message, e.stdout && e.stdout.toString()); }
