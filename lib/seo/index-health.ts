/**
 * 「收录体检」采集器（owner 2026-10-12：技术侧做完 SSR 内链后，把百度收录这条链路的
 * 现状做成后台可一键查看的面板）
 * ==========================================================================
 * 能自动查的（本模块负责）：
 *   · robots.txt 是否可读、是否声明 sitemap、是否屏蔽 /admin /api；
 *   · sitemap.xml / sitemap-images.xml 是否可读、URL 条数、是否带 hreflang；
 *   · **覆盖率**：库里"该被收录"的已发布内容数 vs sitemap 实际条数（差额≈0 才算齐）；
 *     并单独给出"故意不进 sitemap"的量（前台不显示的产品 / 草稿新闻）便于解释差异；
 *   · **抽样可达性**：从 sitemap 里随机抽几条实抓，看状态码（全 200 = 爬虫不会撞到 404）；
 *   · 推送通道配置（百度 site/token、IndexNow key）与**推送历史**（每次推送后落盘）。
 * 查不了的（只能人工在百度平台确认，面板里给深链接 + 勾选清单）：
 *   · sitemap 是否已提交、索引量、抓取频次、快速收录配额 —— 百度未提供查询 API。
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getBaiduPushConfig } from "@/lib/seo/baidu-push";
import { getIndexNowConfig } from "@/lib/seo/indexnow";
import { getSiteBaseUrl as deploymentSiteUrl } from "@/lib/site-url";

export interface IndexHealthSample {
  url: string;
  status: number;
}

export interface IndexHealthPushLog {
  at: string;
  count: number;
  baiduOk: boolean;
  baiduBody?: string;
  indexnowOk: boolean;
  indexnowBody?: string;
}

export interface IndexHealth {
  checkedAt: string;
  baseUrl: string;
  robots: { ok: boolean; status?: number; declaresSitemap: boolean; blocksAdminAndApi: boolean; error?: string };
  sitemap: { ok: boolean; status?: number; urlCount: number; hasHreflang: boolean; ms?: number; error?: string };
  imagesSitemap: { ok: boolean; status?: number };
  coverage: {
    liveProducts: number;
    liveNews: number;
    liveIndustries: number;
    liveServices: number;
    liveCases: number;
    staticPages: number;
    expected: number;
    hiddenProducts: number;
    draftNews: number;
    gap: number;
  };
  samples: IndexHealthSample[];
  config: {
    /** 后台「百度收录站点地址」原样值（可能为空或写错） */
    baiduSite?: string;
    /** 该值是否是合法 http(s) 地址；false ⇒ 本次体检用的是部署级域名兜底（见 fallbackBaseUrl） */
    baiduSiteUrlValid: boolean;
    /** 校验失败时的兜底域名（来自 NEXT_PUBLIC_SITE_URL） */
    fallbackBaseUrl?: string;
    hasBaiduToken: boolean;
    hasIndexNowKey: boolean;
  };
  /**
   * 页脚 ICP 备案号（**自动检测**，owner 2026-10-12 反馈"已经显示了"后加的）。
   * ⚠️ 必须查 `/api/public/oem` 而**不是**抓首页 HTML：页脚是客户端组件（`components/layout/Footer.tsx`
   *    里 fetch OEM 配置后才渲染），服务端 HTML 里永远看不到备案号 —— 早先据此误判成"未配置"。
   */
  icp: { ok: boolean; value?: string; showLegal?: boolean; error?: string };
  pushLog: IndexHealthPushLog[];
  manual: { key: string; label: string; hint: string; href: string }[];
}

const LOG_PATH = () => join(process.cwd(), "data", "seo-push-log.jsonl");

/** 追加一条推送记录（由 /api/admin/seo/baidu-push 成功后调用） */
export function appendPushLog(entry: IndexHealthPushLog): void {
  try {
    const p = LOG_PATH();
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    appendFileSync(p, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* 记录失败不影响推送本身 */
  }
}

function readPushLog(limit = 8): IndexHealthPushLog[] {
  try {
    const p = LOG_PATH();
    if (!existsSync(p)) return [];
    const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l) as IndexHealthPushLog;
        } catch {
          return null;
        }
      })
      .filter((x): x is IndexHealthPushLog => !!x)
      .reverse(); // 最新的在前
  } catch {
    return [];
  }
}

/** 带超时的 fetch（体检不能把后台页面拖死） */
async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const res = await fetch(url, { cache: "no-store", signal: ctl.signal });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

/** 静态页数量（与 app/sitemap.ts 的 STATIC_PAGES 保持同一口径的近似值；仅用于覆盖率对比） */
const STATIC_PAGES = 20;

export async function collectIndexHealth(): Promise<IndexHealth> {
  const cfg = await getBaiduPushConfig();
  const inw = await getIndexNowConfig();
  /**
   * 站点地址容错（owner 2026-10-12）：
   * 后台的「百度收录站点地址」实测被写成过地区码（`CN-BJ`）—— 一旦如此，
   * 原来会让整个体检"全线超时"，看不出真正原因。现在：**不是 http(s) 地址就回退到部署级域名**
   * （`NEXT_PUBLIC_SITE_URL`），并在返回里显式标出 `baiduSiteUrlValid=false` 让面板告警。
   */
  const configuredSite = String(cfg.site || "").trim();
  const baiduSiteUrlValid = /^https?:\/\//i.test(configuredSite);
  const fallbackBaseUrl = deploymentSiteUrl();
  const baseUrl = (baiduSiteUrlValid ? configuredSite : fallbackBaseUrl).replace(/\/+$/, "");

  // ---- robots.txt ----
  let robots: IndexHealth["robots"] = { ok: false, declaresSitemap: false, blocksAdminAndApi: false };
  if (baseUrl) {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`);
    if (res) {
      const text = await res.text().catch(() => "");
      robots = {
        ok: res.ok,
        status: res.status,
        declaresSitemap: /sitemap:/i.test(text),
        blocksAdminAndApi: /disallow:\s*\/admin/i.test(text) && /disallow:\s*\/api/i.test(text),
      };
    } else {
      robots.error = "取 robots.txt 失败（超时或网络不可达）";
    }
  } else {
    robots.error = "未配置收录推送站点地址（站点设置 → SEO）";
  }

  // ---- sitemap.xml / sitemap-images.xml ----
  let sitemap: IndexHealth["sitemap"] = { ok: false, urlCount: 0, hasHreflang: false };
  let imagesSitemap: IndexHealth["imagesSitemap"] = { ok: false };
  let urls: string[] = [];
  if (baseUrl) {
    const t0 = Date.now();
    const res = await fetchWithTimeout(`${baseUrl}/sitemap.xml`);
    if (res) {
      const text = await res.text().catch(() => "");
      urls = Array.from(text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
      sitemap = {
        ok: res.ok,
        status: res.status,
        urlCount: urls.length,
        hasHreflang: /xhtml:link[^>]*hreflang=/i.test(text),
        ms: Date.now() - t0,
      };
    } else {
      sitemap.error = "取 sitemap.xml 失败（超时或网络不可达）";
    }
    const res2 = await fetchWithTimeout(`${baseUrl}/sitemap-images.xml`);
    imagesSitemap = { ok: !!res2?.ok, status: res2?.status };
  }

  // ---- 覆盖率（库里"该收录"的内容 vs sitemap 条数）----
  let coverage: IndexHealth["coverage"] = {
    liveProducts: 0, liveNews: 0, liveIndustries: 0, liveServices: 0, liveCases: 0,
    staticPages: STATIC_PAGES, expected: 0, hiddenProducts: 0, draftNews: 0, gap: 0,
  };
  try {
    const [liveProducts, hiddenProducts, liveNews, draftNews, liveIndustries, liveServices, liveCases] =
      await Promise.all([
        prisma.product.count({ where: { status: "published", visible: true } }),
        prisma.product.count({ where: { visible: false } }),
        prisma.news.count({ where: { status: "published" } }),
        prisma.news.count({ where: { status: { not: "published" } } }),
        prisma.industry.count({ where: { status: "published" } }),
        prisma.service.count({ where: { status: "published" } }),
        prisma.case.count({ where: { status: "published" } }),
      ]);
    const expected = STATIC_PAGES + liveProducts + liveNews + liveIndustries + liveServices + liveCases;
    coverage = {
      liveProducts, liveNews, liveIndustries, liveServices, liveCases,
      staticPages: STATIC_PAGES, expected,
      hiddenProducts, draftNews,
      gap: sitemap.urlCount - expected,
    };
  } catch (e: any) {
    coverage.expected = -1;
    coverage.gap = 0;
    console.error("[index-health] 覆盖率统计失败:", e?.message);
  }

  // ---- 抽样可达性（最多 8 条，随机但稳定：等距取）----
  const samples: IndexHealthSample[] = [];
  if (urls.length) {
    const pick: string[] = [];
    const step = Math.max(1, Math.floor(urls.length / 8));
    for (let i = 0; i < urls.length && pick.length < 8; i += step) pick.push(urls[i]);
    const results = await Promise.all(
      pick.map(async (u) => {
        const r = await fetchWithTimeout(u, 8000);
        return { url: u, status: r ? r.status : 0 };
      })
    );
    samples.push(...results);
  }

  // ---- 页脚 ICP 备案号（自动检测：查 OEM 接口，而不是抓首页 HTML，见接口注释）----
  let icp: IndexHealth["icp"] = { ok: false };
  if (baseUrl) {
    const res = await fetchWithTimeout(`${baseUrl}/api/public/oem`);
    if (res?.ok) {
      try {
        const j = await res.json();
        const value = String(j?.data?.icp ?? "").trim();
        const showLegal = j?.data?.showLegal !== false;
        const isPlaceholder = !value || /x{4,}/i.test(value); // 代码默认值形如 京ICP备xxxxxxxx号
        icp = { ok: !isPlaceholder && showLegal, value: value || undefined, showLegal };
      } catch {
        icp = { ok: false, error: "OEM 接口返回无法解析" };
      }
    } else {
      icp = { ok: false, error: "取 /api/public/oem 失败（超时或不可达）" };
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    baseUrl,
    robots,
    sitemap,
    imagesSitemap,
    coverage,
    samples,
    config: {
      baiduSite: cfg.site,
      baiduSiteUrlValid,
      fallbackBaseUrl,
      hasBaiduToken: !!cfg.token,
      hasIndexNowKey: !!(inw.key && inw.host),
    },
    icp,
    pushLog: readPushLog(),
    manual: [
      { key: "submit-sitemap", label: "在百度搜索资源平台提交 sitemap", hint: "普通收录 → sitemap → 提交 /sitemap.xml（首次必做，之后自动跟踪）", href: "https://ziyuan.baidu.com/sitemap/index" },
      { key: "push-all", label: "用本页「立即推送全部 URL」补推存量", hint: "新增/更新内容再单独推；面板下方会记录每次推送结果", href: "https://ziyuan.baidu.com/linksubmit/index" },
      { key: "crawl-diagnose", label: "看一次「抓取诊断」", hint: "确认 Baiduspider 抓到的 HTML 里有内容与内链（本轮已把列表页/首页改为服务端渲染）", href: "https://ziyuan.baidu.com/crawltools/index" },
      { key: "index-monitor", label: "盯「索引量」曲线", hint: "提交/推送后通常 3~14 天开始有量，之后每周看一次", href: "https://ziyuan.baidu.com/indexs/index" },
    ],
  };
}
