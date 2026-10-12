/**
 * 搜索引擎爬虫来访统计（owner 2026-10-12：「把爬虫来访做进收录体检面板」）
 * ==========================================================================
 * 为什么需要它：sitemap / robots / 内链都是"我们做了什么"，而**爬虫来没来、抓到哪一层**
 * 才是真正的结果指标。实测（左文站）：2026-09-28~10-12 期间 bingbot 1296 次、Googlebot 303 次，
 * 而 **Baiduspider 只有十几次、且几乎全打在首页** —— 这类事实只有翻访问日志才看得到。
 *
 * 数据源：nginx access log（`/var/log/nginx/access.log*`）。
 *   · 两站的轮转命名不同：左文站 `access.log.N(.gz)`、阀门站 `access.log-YYYYMMDD(.zst)`
 *   · `.gz` 用 zlib 解、`.zst` 走 `zstd -dc`（实测两站都装了 zstd）；解不开的文件跳过不报错
 *   · 应用进程在两站都是 **root**（能读 nginx 日志）；读不到时只返回 error，不影响其它体检项
 *
 * 已知局限（面板里也如实写明）：
 *   · UA 可以伪造 —— 打 `/.env`、`/service-account.json` 这类基础设施路径的"Baiduspider"多半是扫描器，
 *     本模块把它们标成 `suspicious` 单独计数；
 *   · 本站自己的探针/自检请求会计入，故按"站点自身域名解析出的 IP + 内网/回环 IP"做了排除。
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { gunzipSync } from "zlib";
import { lookup } from "node:dns/promises";

export interface CrawlerHit {
  /** 日志里的原始时间串（如 12/Oct/2026:16:46:00） */
  at: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  /**
   * content = 内容页（产品/新闻/行业/服务/关于/案例/FAQ/资源/招聘）
   * suspicious = 基础设施/扫描路径（.env、wp-、.json、.php…）
   * other = 其它
   */
  kind: "content" | "suspicious" | "other";
}

export interface CrawlerVisits {
  ok: boolean;
  error?: string;
  /** 实际读了哪些日志文件（按名字升序） */
  files: { name: string; lines: number }[];
  scannedLines: number;
  /** 站点自身 IP（用于排除自测请求；解析不到则留空） */
  selfIp?: string;
  selfFiltered: number;
  /** 各爬虫总量（降序） */
  byBot: { key: string; label: string; count: number }[];
  /** 百度单独细看 */
  baidu: {
    count: number;
    lastAt?: string;
    /** 真正落在内容页上的次数 —— 这个数 > 0 才说明它开始"往深里爬" */
    content: number;
    suspicious: number;
    perDay: { day: string; count: number }[];
    recent: CrawlerHit[];
  };
  scannedAt: string;
}

const BOTS: { key: string; label: string; re: RegExp }[] = [
  { key: "baidu", label: "Baiduspider（百度）", re: /baiduspider/i },
  { key: "google", label: "Googlebot", re: /googlebot/i },
  { key: "bing", label: "Bingbot", re: /bingbot/i },
  { key: "bytespider", label: "Bytespider（字节）", re: /bytespider/i },
  { key: "petal", label: "PetalBot（华为）", re: /petalbot/i },
  { key: "sogou", label: "Sogou（搜狗）", re: /sogou/i },
  { key: "360", label: "360Spider", re: /360spider/i },
  { key: "yandex", label: "YandexBot", re: /yandex/i },
];

const LOG_DIR = process.env.NGINX_LOG_DIR || "/var/log/nginx";
const MAX_FILES = 30;
const MAX_BYTES = 40 * 1024 * 1024; // 最多解 40MB 文本，防止超大日志拖死后台
const CACHE_TTL_MS = 10 * 60 * 1000; // 进程内缓存 10 分钟（面板每 60s 自检不要反复扫盘）

/** 内容页路径（爬虫抓到这些，才说明它开始往深处爬） */
const CONTENT_RE = /^\/(products|news|industries|services|about|cases|faqs|resources|careers)(\/|$|\?)/i;
/** 基础设施/扫描路径 —— 多半是伪装成爬虫的扫描器 */
const SUSPICIOUS_RE = /\.env|\.git|\/wp-|xmlrpc|__vite|inngest|\.php|\.sql|service-account|\.ya?ml$|\.json$/i;

const LOG_LINE_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"/;

/** `12/Oct/2026:16:46:00` → `2026-10-12`（便于排序与展示） */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function toIsoDay(at: string): string {
  const m = /^(\d{2})\/([A-Za-z]{3})\/(\d{4})/.exec(at);
  if (!m) return at.slice(0, 11);
  const mi = MONTHS.indexOf(m[2]) + 1;
  return `${m[3]}-${String(mi).padStart(2, "0")}-${m[1]}`;
}

/**
 * `12/Oct/2026:16:46:00 +0800` → epoch（毫秒）。
 * 🔴 必须按时间戳排序，**不能按字符串**：跨月时 `"30/Sep"` 在字典序上大于 `"10/Oct"`，
 *    会把"最近来访"显示成一个月前的旧记录（实测踩到）。
 */
function toEpoch(at: string): number {
  const m = /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/.exec(at);
  if (!m) return 0;
  const mi = MONTHS.indexOf(m[2]);
  if (mi < 0) return 0;
  const tz = m[7] ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : "Z";
  const d = Date.parse(`${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1]}T${m[4]}:${m[5]}:${m[6]}${tz}`);
  return Number.isNaN(d) ? 0 : d;
}

let cache: { at: number; value: CrawlerVisits } | null = null;

function isInternalIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/** 站点自身的公网 IP（用于排除自测请求）——解析不到就返回 undefined，不影响统计 */
async function resolveSelfIp(siteHost?: string): Promise<string | undefined> {
  if (!siteHost) return undefined;
  try {
    const r = await lookup(siteHost);
    return r?.address;
  } catch {
    return undefined;
  }
}

function readLogFile(path: string): string | null {
  try {
    if (path.endsWith(".gz")) return gunzipSync(readFileSync(path)).toString("utf8");
    if (path.endsWith(".zst")) {
      // 阀门站是 zstd 轮转（RHEL 系默认）；zstd 不存在或解压失败 ⇒ 跳过该文件
      return execFileSync("zstd", ["-dc", path], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
    }
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function listLogFiles(): string[] {
  try {
    return readdirSync(LOG_DIR)
      .filter((n) => /^access\.log(\.|-)/.test(n) || n === "access.log")
      .map((n) => join(LOG_DIR, n))
      .filter((p) => {
        try {
          return statSync(p).isFile();
        } catch {
          return false;
        }
      })
      .slice(0, MAX_FILES);
  } catch {
    return [];
  }
}

/** 扫全部日志，统计爬虫来访（带 10 分钟进程内缓存） */
export async function collectCrawlerVisits(siteHost?: string): Promise<CrawlerVisits> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const empty: CrawlerVisits = {
    ok: false,
    files: [],
    scannedLines: 0,
    selfFiltered: 0,
    byBot: [],
    baidu: { count: 0, content: 0, suspicious: 0, perDay: [], recent: [] },
    scannedAt: new Date().toISOString(),
  };

  if (!existsSync(LOG_DIR)) {
    const v = { ...empty, error: `未找到日志目录 ${LOG_DIR}（容器/自定义路径可用 NGINX_LOG_DIR 指定）` };
    cache = { at: Date.now(), value: v };
    return v;
  }

  const files = listLogFiles();
  if (files.length === 0) {
    const v = { ...empty, error: `日志目录 ${LOG_DIR} 下没有 access.log* 文件` };
    cache = { at: Date.now(), value: v };
    return v;
  }

  const selfIp = await resolveSelfIp(siteHost);
  const counts = new Map<string, number>();
  const perDay = new Map<string, number>();
  const baiduRecent: CrawlerHit[] = [];
  let baiduCount = 0;
  let baiduContent = 0;
  let baiduSuspicious = 0;
  let baiduLast: string | undefined;
  let baiduLastEpoch = 0;
  let scannedLines = 0;
  let selfFiltered = 0;
  let bytes = 0;
  const readFiles: { name: string; lines: number }[] = [];

  for (const p of files) {
    if (bytes > MAX_BYTES) break;
    const text = readLogFile(p);
    if (!text) continue;
    bytes += text.length;
    let lines = 0;
    for (const line of text.split("\n")) {
      if (!line || !/spider|bot|baidu|google|sogou|yandex/i.test(line)) continue;
      const m = LOG_LINE_RE.exec(line);
      if (!m) continue;
      const [, ip, at, method, path, statusStr, ua] = m;
      const bot = BOTS.find((b) => b.re.test(ua));
      if (!bot) continue;
      lines += 1;
      scannedLines += 1;
      if (isInternalIp(ip) || (selfIp && ip === selfIp)) {
        selfFiltered += 1;
        continue;
      }
      counts.set(bot.key, (counts.get(bot.key) || 0) + 1);
      if (bot.key !== "baidu") continue;

      const status = Number(statusStr) || 0;
      const kind: CrawlerHit["kind"] = SUSPICIOUS_RE.test(path)
        ? "suspicious"
        : CONTENT_RE.test(path)
          ? "content"
          : "other";
      baiduCount += 1;
      if (kind === "content") baiduContent += 1;
      if (kind === "suspicious") baiduSuspicious += 1;
      const day = toIsoDay(at);
      perDay.set(day, (perDay.get(day) || 0) + 1);
      const ep = toEpoch(at);
      if (ep >= baiduLastEpoch) {
        baiduLastEpoch = ep;
        baiduLast = at;
      }
      baiduRecent.push({ at, ip, method, path, status, kind });
    }
    readFiles.push({ name: p.replace(`${LOG_DIR}/`, ""), lines });
  }

  // 按**时间戳**倒序（不能按字符串：跨月会排错，见 toEpoch 注释）
  baiduRecent.sort((a, b) => toEpoch(b.at) - toEpoch(a.at));

  const byBot = BOTS.map((b) => ({ key: b.key, label: b.label, count: counts.get(b.key) || 0 }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const value: CrawlerVisits = {
    ok: true,
    files: readFiles,
    scannedLines,
    selfIp,
    selfFiltered,
    byBot,
    baidu: {
      count: baiduCount,
      lastAt: baiduLast,
      content: baiduContent,
      suspicious: baiduSuspicious,
      perDay: Array.from(perDay, ([day, count]) => ({ day, count })).sort((a, b) => (a.day < b.day ? -1 : 1)),
      recent: baiduRecent.slice(0, 12),
    },
    scannedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), value };
  return value;
}
