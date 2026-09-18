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
const next = require('next');

const dev = process.env.NODE_ENV === 'development'; // 默认（未显式设置）按生产模式运行，与 next start 一致
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const ROUTER_STATE_HEADER = 'next-router-state-tree';

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
    createServer((req, res) => {
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
      handle(req, res);
    }).listen(port, hostname);
    console.log(`> Ready on http://${hostname}:${port}`);
  })
  .catch((err) => {
    console.error('> Failed to start server', err);
    process.exit(1);
  });

// ---- AI 自动运营定时调度（每分钟 tick 一次内部路由，到点触发）----
let autopilotTimer = null;
function startAutopilotScheduler() {
  if (autopilotTimer) return;
  const tick = async () => {
    try {
      // 🔴 2026-09-15 安全修复：此前兜底是常量 `'zuowen-internal-tick'`（带别家品牌名），
      //    等于把内部触发密钥公开。现**必须显式配置** AUTOPILOT_TICK_SECRET，
      //    未配置时**不发 tick 请求**（并告警），而不是拿一个已知常量去发。
      const secret = process.env.AUTOPILOT_TICK_SECRET;
      if (!secret) {
        console.warn('[autopilot] 未配置 AUTOPILOT_TICK_SECRET，定时调度已禁用（不会发出 tick 请求）。请在服务器 .env 中配置后重启。');
        return;
      }
      const res = await fetch('http://127.0.0.1:' + port + '/api/admin/ai-autopilot/tick', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
        body: '{}',
      });
      if (res.status === 200) {
        const d = await res.json().catch(() => null);
        if (d && d.ran) console.log('[autopilot] scheduled run executed');
      }
    } catch (e) {
      console.error('[autopilot] tick error:', e && e.message ? e.message : String(e));
    }
  };
  autopilotTimer = setInterval(tick, 60 * 1000);
  tick();
}
if (process.env.NODE_ENV !== 'development') {
  startAutopilotScheduler();
}
