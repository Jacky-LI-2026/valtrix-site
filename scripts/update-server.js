// 更新托管服务器（供应商侧，仅在本机/供应商服务器运行，与客户部署包无关）
// 作用：托管增量更新包 + 提供 /api/version/latest 版本检查接口，
//       客户后台「系统更新 → 检查更新 / 在线升级」即可自动拉取并升级。
//
// 用法：
//   1. 用 scripts/_make_incremental_update.js 生成增量包 zip，放到 ./updates/downloads/
//   2. 编辑 ./updates/updates.json，登记版本信息（见示例）
//   3. 启动：node scripts/update-server.js [端口]（默认 8787）
//   4. 用 Nginx 反代到公网，如 https://updates.zuowen.com
//   5. 在客户 .env 配置 UPDATE_SERVER_URL=https://updates.zuowen.com
//
// updates.json 示例：
// [
//   { "version": "1.3.0", "releaseNotes": "修复窄屏导航崩溃；新增新闻分享", "file": "zuowen-update-1.3.0.zip", "publishedAt": "2026-09-03" }
// ]
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.argv[2] || "8787", 10);
const ROOT = path.join(__dirname, "..", "updates");
const DOWNLOADS = path.join(ROOT, "downloads");
const UPDATES_JSON = path.join(ROOT, "updates.json");

const mime = { ".zip": "application/zip", ".json": "application/json" };

function readUpdates() {
  try {
    let raw = fs.readFileSync(UPDATES_JSON, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // 去 BOM
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "").split("?")[0]);

  // 版本检查接口（客户 检查更新 调用）
  if (url === "/api/version/latest") {
    const updates = readUpdates().sort((a, b) => {
      const pa = String(a.version).split(".").map(Number);
      const pb = String(b.version).split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d;
      }
      return 0;
    });
    if (!updates.length) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ updates: [], latest: null, hasUpdate: false }));
      return;
    }
    // 返回全部版本列表（客户侧按版本号展示，可多版本选择）
    const list = updates.map((u) => ({
      version: u.version,
      releaseNotes: u.releaseNotes || "",
      file: u.file,
      publishedAt: u.publishedAt || "",
    }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ updates: list, latest: list[list.length - 1], hasUpdate: true }));
    return;
  }

  // 版本列表（调试用）
  if (url === "/api/updates") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(readUpdates()));
    return;
  }

  // 下载更新包
  if (url.startsWith("/downloads/")) {
    const name = path.basename(url.replace("/downloads/", ""));
    const filePath = path.join(DOWNLOADS, name);
    if (!filePath.startsWith(DOWNLOADS) || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(name)] || "application/octet-stream", "Content-Length": fs.statSync(filePath).size });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Update server: use /api/version/latest or /downloads/<file>");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("更新托管服务器已启动: http://0.0.0.0:" + PORT);
  console.log("版本接口: /api/version/latest");
  console.log("下载目录: " + DOWNLOADS);
  console.log("登记文件: " + UPDATES_JSON);
});
