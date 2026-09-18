// 同步 fr 数据 + 新闻图片到服务器 8.130.65.182
const { Client } = require("ssh2");
const fs = require("fs");

const HOST = "8.130.65.182";
const USER = "root";
const PASS = require("./_credentials").getServerPassword(process.env.DSH_SITE || "valve");
const DEPLOY = "/var/www/zuowen";

const localFiles = [
  { local: "tmp/fr-sync.sql", remote: "/tmp/fr-sync.sql" },
  { local: "public/uploads/1788260103626-nz3rf2.webp", remote: "/var/www/zuowen/public/uploads/1788260103626-nz3rf2.webp" },
  { local: "public/uploads/news/jiuquan-project-content-1.webp", remote: "/var/www/zuowen/public/uploads/news/jiuquan-project-content-1.webp" },
];

const conn = new Client();
conn
  .on("ready", () => {
    console.log("SSH 已连接", HOST);
    // 确保目录
    conn.exec("mkdir -p /var/www/zuowen/public/uploads/news", (err, stream) => {
      if (err) return fail(err);
      stream.on("close", () => {
        // 上传文件
        let i = 0;
        const next = () => {
          if (i >= localFiles.length) return runSql();
          const f = localFiles[i++];
          console.log("上传", f.local, "->", f.remote);
          conn.sftp((err2, sftp) => {
            if (err2) return fail(err2);
            sftp.fastPut(f.local, f.remote, (err3) => {
              if (err3) return fail(err3);
              console.log("  完成", f.remote);
              next();
            });
          });
        };
        next();
      });
      stream.on("data", () => {});
      stream.stderr.on("data", (d) => console.log("stderr:", String(d)));
    });
    function runSql() {
      console.log("=== 执行 fr-sync.sql ===");
      // 从 .env 读 DATABASE_URL
      const cmd =
        "cd " + DEPLOY + " && " +
        "DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\"' | tr -d \"'\" | sed 's/\\?schema=[^&]*//') ; " +
        "echo 'DBURL prefix: '${DBURL%%:*} ; " +
        "psql \"$DBURL\" -f /tmp/fr-sync.sql && echo 'SQL 导入成功'";
      conn.exec(cmd, (err, stream) => {
        if (err) return fail(err);
        let out = "";
        stream.on("data", (d) => { out += d; process.stdout.write(String(d)); });
        stream.stderr.on("data", (d) => { out += d; process.stdout.write(String(d)); });
        stream.on("close", (code) => {
          console.log("SQL 执行退出码:", code);
          conn.end();
        });
      });
    }
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
