// 同步商城模拟数据（scd-tool 规格/散热片基准价/对公账户示例）到服务器 8.130.65.182
const { Client } = require("ssh2");
const fs = require("fs");

const HOST = "8.130.65.182";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY = "/var/www/zuowen";

const sql = `
UPDATE shop_products SET specs = '[{"name":"刀尖圆弧","nameEn":"Nose Radius","options":[{"label":"0.2mm R","labelEn":"0.2mm R","price":"0","stock":-1},{"label":"0.5mm R","labelEn":"0.5mm R","price":"300","stock":-1},{"label":"1.0mm R","labelEn":"1.0mm R","price":"800","stock":-1}]},{"name":"刃口类型","nameEn":"Edge Type","options":[{"label":"标准刃","labelEn":"Standard","price":"0","stock":-1},{"label":"加强刃","labelEn":"Reinforced","price":"400","stock":-1}]}]'::jsonb,
  "priceTiers" = '[{"qty":10,"price":"98"},{"qty":50,"price":"95"}]'::jsonb, price = 1200, "minOrder" = 1
WHERE slug = 'scd-tool';
UPDATE shop_products SET price = 280 WHERE slug = 'hs-standard';
UPDATE shop_products SET price = 360 WHERE slug = 'hs-high';
INSERT INTO site_config ("configKey", "configValue", "updatedAt") VALUES ('shop_bank_info', '{"accountName":"北京左文科技有限公司","bankName":"中国工商银行北京海淀支行","accountNo":"1100235045678901","branch":"中国工商银行北京中关村支行","remark":"示例账户信息，正式对公账户请联系财务确认后修改"}'::jsonb, NOW())
ON CONFLICT ("configKey") DO UPDATE SET "configValue" = EXCLUDED."configValue", "updatedAt" = NOW();
`;

fs.writeFileSync("tmp/shop-demo-sync.sql", sql, "utf8");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("SSH 已连接", HOST);
    conn.sftp((err, sftp) => {
      if (err) return fail(err);
      sftp.fastPut("tmp/shop-demo-sync.sql", "/tmp/shop-demo-sync.sql", (err2) => {
        if (err2) return fail(err2);
        console.log("SQL 已上传");
        const cmd =
          "cd " + DEPLOY + " && " +
          "DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | tr -d \"'\" | sed 's/\\?schema=[^&]*//') ; " +
          "psql \"$DBURL\" -f /tmp/shop-demo-sync.sql && echo 'SQL 导入成功'";
        conn.exec(cmd, (err3, stream) => {
          if (err3) return fail(err3);
          stream.on("data", (d) => process.stdout.write(String(d)));
          stream.stderr.on("data", (d) => process.stdout.write(String(d)));
          stream.on("close", (code) => {
            console.log("SQL 执行退出码:", code);
            conn.end();
          });
        });
      });
    });
  })
  .on("error", (err) => {
    console.error("SSH 错误:", err.message);
    process.exit(1);
  })
  .connect({ host: HOST, username: USER, password: PASS, keepaliveInterval: 10000, keepaliveCountMax: 12 });

function fail(err) {
  console.error("失败:", err.message);
  conn.end();
  process.exit(1);
}
