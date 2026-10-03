/* eslint-disable no-console */
// 自定义 Next.js 生产服务器
// 解决：iPhone（iOS WKWebKit：Safari/Chrome/Edge/企业微信内置浏览器）在 SPA
// 点击导航时发送畸形 `Next-Router-State-Tree` 请求头，导致服务端
// `parse-and-validate-flight-router-state` 抛异常 → 500 → 前端 Application error。
//
// 该请求头会被 Next 内部在 middleware 之前剥离、在渲染前重新注入，
// middleware 无法拦截（已验证）。因此必须在 Next 处理之前（即原生 HTTP
// 层）校验并删除畸形请求头，使导航降级为整页加载。
const { createServer } = require('http');
const http = require('http');
const fs = require('fs');
const path = require('path');
const next = require('next');
// 维护模式：后台开关打开后，前台访客收到 503 维护页；后台/接口/静态资源/本机/管理员全部旁路。
// 放在 Node 层的原因见 lib/server/maintenance.js 顶部注释（中间件是 Edge 运行时，读不了库）。
const maintenance = require('./lib/server/maintenance');

const dev = process.env.NODE_ENV === 'development'; // 默认（未显式设置）按生产模式运行，与 next start 一致
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const ROUTER_STATE_HEADER = 'next-router-state-tree';

// ============================================================================
// /uploads/* 直连静态服务
// ----------------------------------------------------------------------------
// 背景（2026-09-14 实测）：Next 14 生产模式在**进程启动时**一次性扫描 `public/`
// 建立文件映射（FsChecker）。此后新增的上传文件**不在映射内 → 持续 404**，
// 必须重启进程才可见。实测证据：
//   · 12:02:37 写入的新文件（进程 11:47:31 启动）→ 404
//   · 同一文件 `pm2 restart` 之后 → 200
// 后果：后台把新图片写进 `public/uploads` 后，前台立刻显示裂图（用户报障：
//   「服务器 uploads 目录新上传文件持续 404，ZW-15D 产品封面图丢失」）。
//
// 修法：在 Next 之前自行服务 `/uploads/*`（fs.stat 每次请求实时判定），
//   命中则直接返回，未命中则**交回 Next**（404 行为不变）。
// ============================================================================
const UPLOAD_PREFIX = '/uploads/';
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const UPLOAD_MIME = {
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8',
};

/** 尝试把 /uploads/* 当作磁盘文件直接服务；命中返回 true，未命中返回 false（交回 Next） */
function serveUpload(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const rawUrl = req.url || '';

  // ---- 分支 A：裸路径 /uploads/** ----
  // ---- 分支 B：`/_next/image?url=/uploads/**` 直通（2026-09-14 新增）----
  //
  // 为什么必须接管 B：Next 的图片优化器对本地图会走 `fetchInternalImage()`，
  //   它用 mock req/res **再次调用 Next 自己的 handleRequest**（实测
  //   node_modules/next/dist/server/image-optimizer.js:594-621），
  //   因此**不经过本文件的 HTTP 层** ⇒ 分支 A 救不了它。
  //   而 Next 自己的静态服务依赖「进程启动时建立的 public 文件映射」，
  //   启动后新上传的文件取不到 → 内部拿到 404 HTML → `received text/html`
  //   → 优化器抛 `ImageError(400) "The requested resource isn't a valid image."`
  //
  // 实测铁证（同一进程/同一目录/同扩展名）：
  //   进程启动**后**新增的文件 39/39 → 优化器 400；启动**前**的 12/12 → 200；
  //   `pm2 restart`（不重新构建）之后同一文件 → 200。
  //   后果：**后台每上传一张图，凡经 next/image 渲染处（站点 LOGO 等）都显示不出来，
  //   必须重启进程才恢复**；生产日志已累计 40 个受影响路径（含 360 帧 25 张）。
  //
  // 本分支把这类请求**直接回原图**（忽略 w/q 缩放参数）——上传图在上传时已被
  //   sharp 压成 1600px WebP q80 并另存 400px `_thumb`，无需再经优化器。
  let rel = null;
  if (rawUrl.startsWith(UPLOAD_PREFIX)) {
    try {
      rel = decodeURIComponent(rawUrl.slice(UPLOAD_PREFIX.length).split('?')[0].split('#')[0]);
    } catch {
      return false; // 非法编码：交回 Next 处理
    }
  } else if (rawUrl.startsWith('/_next/image')) {
    const qi = rawUrl.indexOf('?');
    if (qi < 0) return false;
    let target = null;
    try {
      target = new URLSearchParams(rawUrl.slice(qi + 1)).get('url');
    } catch {
      return false;
    }
    // 仅接管指向上传目录的；其余（/images/**、远程图）一律交回 Next 的优化器
    if (!target || !target.startsWith(UPLOAD_PREFIX)) return false;
    try {
      rel = decodeURIComponent(target.slice(UPLOAD_PREFIX.length));
    } catch {
      return false;
    }
  } else {
    return false;
  }
  if (!rel) return false;

  // 防目录穿越：规范化后必须仍落在 UPLOAD_DIR 之内
  const target = path.normalize(path.join(UPLOAD_DIR, rel));
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return true;
  }

  let st;
  try {
    st = fs.statSync(target);
  } catch {
    return false; // 不存在：交回 Next（保持原有 404 行为）
  }
  if (!st.isFile()) return false;

  const ext = path.extname(target).toLowerCase();
  res.setHeader('Content-Type', UPLOAD_MIME[ext] || 'application/octet-stream');
  res.setHeader('Last-Modified', st.mtime.toUTCString());
  res.setHeader('Cache-Control', 'public, max-age=604800'); // 与 middleware 对 /uploads 的设置一致
  res.setHeader('Accept-Ranges', 'bytes');

  // 条件请求：命中 If-Modified-Since 直接 304
  const ims = req.headers['if-modified-since'];
  if (ims) {
    const since = Date.parse(ims);
    if (!Number.isNaN(since) && st.mtime.getTime() - since < 1000) {
      res.statusCode = 304;
      res.end();
      return true;
    }
  }

  // Range 支持（视频/360 帧拖动需要）
  const range = req.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (m) {
    let start = m[1] === '' ? undefined : parseInt(m[1], 10);
    let end = m[2] === '' ? undefined : parseInt(m[2], 10);
    if (start === undefined && end !== undefined) {
      start = Math.max(0, st.size - end);
      end = st.size - 1;
    } else {
      if (start === undefined) start = 0;
      if (end === undefined || end >= st.size) end = st.size - 1;
    }
    if (start > end || start >= st.size) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${st.size}`);
      res.end();
      return true;
    }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(target, { start, end }).pipe(res);
    return true;
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', st.size);
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(target).pipe(res);
  return true;
}

/** 校验 router state header 是否合法（与 Next 内部一致：decodeURIComponent + JSON.parse） */
function isValidRouterStateHeader(value) {
  try {
    JSON.parse(decodeURIComponent(value));
    return true;
  } catch {
    return false;
  }
}

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      // ---- 在 Next 处理前校验并清理畸形 RSC 请求头 ----
      const routerState = req.headers[ROUTER_STATE_HEADER];
      if (routerState && !isValidRouterStateHeader(String(routerState))) {
        // 畸形：删除 RSC 相关请求头，让客户端降级为整页导航
        delete req.headers[ROUTER_STATE_HEADER];
        delete req.headers['rsc'];
        delete req.headers['next-url'];
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        url.searchParams.delete('_rsc');
        req.url = url.pathname + url.search;
      }
      // ---- /uploads/* 直连磁盘（新上传文件无需重启即可访问，见上方 serveUpload 注释）----
      if (serveUpload(req, res)) return;
      // ---- 维护模式（503）----
      // 任何异常都在 maybeServe 内部兜住并返回 false ⇒ 放行给 Next，绝不因维护逻辑自身出错而挡站
      if (await maintenance.maybeServe(req, res)) return;
      handle(req, res);
    }).listen(port, hostname);
    console.log(`> Ready on http://${hostname}:${port}`);
    // ---- AI 自动运营定时调度：必须在 listen() **之后**启动 ----
    // 🔴 2026-09-18：此前该调用在模块顶层，早于 `app.prepare()` 完成 ⇒ 首次 tick
    //    （启动即执行一次）会撞上"端口还没监听" ⇒ `connect ECONNREFUSED 127.0.0.1:3000`。
    //    挪到这里：既消除启动噪声，也保证第一次 tick 就打在可用的服务上。
    if (process.env.NODE_ENV !== 'development') {
      startAutopilotScheduler();
    }
  })
  .catch((err) => {
    console.error('> Failed to start server', err);
    process.exit(1);
  });

// ---- AI 自动运营定时调度（每分钟 tick 一次内部路由，到点触发）----
let autopilotTimer = null;

/**
 * 调用内部 tick 端点。
 *
 * 🔴 2026-09-18 修复：此前用 `fetch()` —— 但本进程在 `app.prepare()` 之后，
 *    `fetch` 已被 **Next 打过补丁**（用于缓存/去重），它在**没有请求上下文**的
 *    `setInterval` 里调用会直接抛错（线上表现为每分钟一条
 *    `[autopilot] tick error: fetch failed`，阀门站累计 1905 条；
 *    同源错误还表现为日志里的 `Cannot read properties of undefined (reading 'workers')`）。
 *    ⇒ 改用 Node 原生 `http.request`，与 Next 的补丁完全解耦。
 *
 *    另：非 200 也要留下日志 —— 此前只在 status===200 时打印，401/403/500 全部静默，
 *    所以"定时任务其实一直没跑"这件事长期没人发现。
 */
function postInternalTick(port, secret) {
  return new Promise((resolve, reject) => {
    const body = '{}';
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/api/admin/ai-autopilot/tick',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-secret': secret,
          'content-length': Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(body);
  });
}

function startAutopilotScheduler() {
  if (autopilotTimer) return;
  const tick = async () => {
    try {
      // 品牌中立兜底密钥（G2）；路由侧同时兼容历史值，避免部分部署时静默 403
      // 🔴 2026-09-15 安全修复：此前兜底是常量 `'cms-internal-tick'` —— 写在仓库里、
      //    任何人可读 ⇒ 等于把内部触发密钥公开（实测生产未配置该 env）。
      //    现**必须显式配置**，未配置时**不发 tick 请求**（并告警），不拿已知常量去发。
      const secret = process.env.AUTOPILOT_TICK_SECRET;
      if (!secret) {
        console.warn('[autopilot] 未配置 AUTOPILOT_TICK_SECRET，定时调度已禁用（不会发出 tick 请求）。请在服务器 .env 中配置后重启。');
        return;
      }
      const res = await postInternalTick(port, secret);
      if (res.status === 200) {
        let d = null;
        try { d = JSON.parse(res.body || 'null'); } catch { /* 非法 JSON 忽略 */ }
        if (d && d.ran) console.log('[autopilot] scheduled run executed');
      } else {
        console.warn(`[autopilot] tick 非 200：status=${res.status} body=${String(res.body).slice(0, 200)}`);
      }
    } catch (e) {
      console.error('[autopilot] tick error:', e && e.message ? e.message : String(e));
    }
  };
  autopilotTimer = setInterval(tick, 60 * 1000);
  tick();
}
