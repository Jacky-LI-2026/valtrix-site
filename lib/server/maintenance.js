/* eslint-disable no-console */
/**
 * 维护模式（owner 2026-09-26 确认要做）
 * ==========================================================================
 * 目标：后台一个开关 → 访客看到「维护中」页面并返回 **HTTP 503**（对搜索引擎是"暂时不可用"，
 *   不会像 404 那样被删索引）；管理员照常使用，后台与接口不受影响。
 *
 * 为什么放在 server.js（Node 层）而不是 middleware：
 *   · 中间件跑在 Edge 运行时，**无法用 Prisma 读库**；本文件跑在 Node，能直接读 `site_config`；
 *   · 503 状态码必须在把请求交给 Next 之前决定 —— server.js 正是这一层。
 *
 * 关键安全口径（都会写进测试）：
 *   1. **读不到配置一律"放行"**（fail-open）：库挂了/配置缺失时，宁可正常展示网站，
 *      也不要把整站挡在维护页后面（2026-09-26 的教训：库没启动时前台还得能退静态兜底）。
 *   2. **旁路**：`/admin`、`/api`、`/_next`、`/uploads`、静态资源后缀、本机 127.0.0.1、
 *      白名单 IP、持有有效会话 cookie 的管理员（含 `__Secure-` 前缀的 https cookie）。
 *      —— 部署脚本会从服务器本机 curl 校验 200，因此"本机旁路"是必须的（否则发版会被自己挡回滚）。
 *   3. 配置读取带 **5 秒内存缓存**：每请求不查库，开启/关闭最多 5 秒生效。
 *
 * 配置（`site_config.configKey = 'maintenance'`）：
 *   {
 *     enabled: boolean,
 *     title:   { zh,en,ja,ko,fr,ar },   // 维护页标题（缺语种回退中文）
 *     message: { zh,en,ja,ko,fr,ar },   // 说明正文（换行转 <br>）
 *     eta: string,                      // 预计恢复时间（自由文本，可空）
 *     contact: string,                  // 联系方式（可空）
 *     bypassIps: string[]               // 额外白名单 IP（可空）
 *   }
 */
const { PrismaClient } = require('../generated/prisma');

const CONFIG_KEY = 'maintenance';
const CACHE_MS = 5000;
/** NextAuth 会话 cookie：https 下会带 __Secure- 前缀，两种都要认 */
const COOKIE_NAMES = ['authjs.session-token', '__Secure-authjs.session-token'];
const BYPASS_PREFIX = ['/admin', '/api', '/_next', '/uploads'];
const BYPASS_EXACT = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/sitemap-images.xml', '/llms.txt', '/manifest.webmanifest'];
const STATIC_EXT = /\.(js|mjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|mp4|webm|mov|pdf|zip|txt|xml|json|csv|xlsx?|docx?|pptx?)$/i;
const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'ar'];

let prisma = null;
let cache = { at: 0, value: null };

function client() {
  if (!prisma) prisma = new PrismaClient({ log: ['error'] });
  return prisma;
}

/** 读配置（5s 缓存）。任何异常 → 视为"未开启"，绝不因此挡站 */
async function readState() {
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_MS) return cache.value;
  let value = null;
  try {
    const row = await client().siteConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    value = row && row.configValue ? row.configValue : null;
  } catch (e) {
    console.error('[maintenance] 读取配置失败（按未开启处理，站点照常访问）:', e && e.message ? e.message : String(e));
    value = null;
  }
  cache = { at: now, value };
  return value;
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  const raw = (Array.isArray(xf) ? xf[0] : xf) || req.socket?.remoteAddress || '';
  return String(raw).split(',')[0].trim().replace(/^::ffff:/, '');
}

function isLocalIp(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}

/** 是否持有有效会话（管理员/已登录用户放行） */
async function hasSession(req) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  const jar = String(req.headers.cookie || '');
  for (const name of COOKIE_NAMES) {
    const hit = jar.split(/;\s*/).find((c) => c.startsWith(name + '='));
    if (!hit) continue;
    try {
      const { decode } = require('next-auth/jwt');
      const token = decodeURIComponent(hit.slice(name.length + 1));
      const payload = await decode({ token, secret, salt: name });
      if (payload && payload.sub) return true;
    } catch {
      /* 解析失败按未登录处理 */
    }
  }
  return false;
}

function localeOf(req) {
  const jar = String(req.headers.cookie || '');
  const hit = jar.split(/;\s*/).find((c) => c.startsWith('locale='));
  const code = hit ? decodeURIComponent(hit.slice('locale='.length)) : 'zh';
  return LANGS.includes(code) ? code : 'zh';
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (obj, locale) => (obj && (obj[locale] || obj.zh)) || '';

/** 维护页（自包含 HTML，不依赖 Next 渲染、不读其他库表 ⇒ 库不稳时也能出页） */
function renderPage(state, locale) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'ZUO WEN';
  const brandEn = process.env.NEXT_PUBLIC_BRAND_NAME_EN || 'ZUO WEN TECHNOLOGY';
  const title = pick(state.title, locale) || (locale === 'zh' ? '网站维护中' : 'Site under maintenance');
  const message = pick(state.message, locale) || (locale === 'zh'
    ? '我们正在对网站进行升级维护，预计很快恢复。给您带来不便，敬请谅解。'
    : 'We are performing scheduled maintenance and will be back shortly. Sorry for the inconvenience.');
  const eta = state.eta ? `<p class="eta">${esc(locale === 'zh' ? '预计恢复时间' : 'Estimated back')}：${esc(state.eta)}</p>` : '';
  const contact = state.contact ? `<p class="contact">${esc(locale === 'zh' ? '紧急联系' : 'Contact')}：${esc(state.contact)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="${esc(locale)}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${esc(title)} · ${esc(brand)}</title>
<style>
  :root{--c:#CC0000}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#f7f7f8;color:#111;font:16px/1.7 'PingFang SC','Microsoft YaHei',system-ui,sans-serif}
  .card{max-width:620px;margin:24px;padding:40px 36px;background:#fff;border-radius:14px;
        border:1px solid #ececec;box-shadow:0 8px 30px rgba(0,0,0,.06);text-align:center}
  .brand{font-weight:700;letter-spacing:.5px;color:#111;margin-bottom:6px}
  .brand small{display:block;font-weight:400;color:#999;letter-spacing:0;font-size:12px;margin-top:2px}
  h1{font-size:22px;margin:18px 0 10px}
  .bar{width:48px;height:4px;background:var(--c);margin:0 auto 18px;border-radius:2px}
  p{margin:8px 0;color:#444;font-size:15px}
  .eta,.contact{color:#666;font-size:14px}
  .hr{height:1px;background:#f0f0f0;margin:22px 0}
  .foot{color:#aaa;font-size:12px}
</style></head>
<body><div class="card">
  <div class="brand">${esc(brand)}<small>${esc(brandEn)}</small></div>
  <div class="bar"></div>
  <h1>${esc(title)}</h1>
  <p>${esc(message).replace(/\n/g, '<br/>')}</p>
  <div class="hr"></div>
  ${eta}${contact}
  <p class="foot">HTTP 503 · Service Unavailable</p>
</div></body></html>`;
}

/**
 * 命中维护模式则直接返回 503 并接管响应（返回 true 表示"已处理，不要再交给 Next"）
 */
async function maybeServe(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const pathname = String(req.url || '/').split('?')[0];
    if (BYPASS_PREFIX.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) return false;
    if (BYPASS_EXACT.includes(pathname)) return false;
    if (STATIC_EXT.test(pathname)) return false;

    const state = await readState();
    if (!state || state.enabled !== true) return false;

    const ip = clientIp(req);
    if (isLocalIp(ip)) return false; // 部署校验从本机发起，必须放行
    if (Array.isArray(state.bypassIps) && state.bypassIps.includes(ip)) return false;
    if (await hasSession(req)) return false;

    const html = renderPage(state, localeOf(req));
    res.writeHead(503, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
      'Retry-After': '3600',
    });
    res.end(req.method === 'HEAD' ? undefined : html);
    return true;
  } catch (e) {
    console.error('[maintenance] 拦截逻辑异常（放行，交给 Next）:', e && e.message ? e.message : String(e));
    return false;
  }
}

module.exports = { maybeServe, renderPage, readState };
