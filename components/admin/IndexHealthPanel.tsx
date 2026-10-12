"use client";

/**
 * 后台「收录体检」面板（owner 2026-10-12）
 * ==========================================================================
 * 把"百度收录"这条链路一次看全：robots / sitemap / **覆盖率**（库里该收录的内容数 vs
 * sitemap 条数）/ **抽样可达性**（sitemap 里的 URL 实抓状态码）/ 推送通道 / **推送历史** /
 * 只能人工在百度平台做的清单（带深链接）。
 *
 * 数据源：`GET /api/admin/seo/index-health`（服务端采集器 `lib/seo/index-health.ts`）。
 * 「立即推送全部 URL」复用既有 `/api/admin/seo/baidu-push`（推完会在面板里留下一条历史记录）。
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import type { IndexHealth } from "@/lib/seo/index-health";

const MANUAL_KEY = "seo-index-manual-checks";

function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
        ok ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-700"
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {text}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 px-3 py-2.5 last:border-0">
      <span className="shrink-0 text-[13px] text-gray-600">{label}</span>
      <span className="text-right text-[12px] text-gray-500">{children}</span>
    </div>
  );
}

export default function IndexHealthPanel() {
  const [h, setH] = useState<IndexHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [msg, setMsg] = useState("");
  const [checked, setChecked] = useState<string[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/seo/index-health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setH((await res.json()) as IndexHealth);
    } catch (e: any) {
      setMsg("体检失败：" + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
    try {
      const raw = localStorage.getItem(MANUAL_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setChecked(arr);
      }
    } catch { /* ignore */ }
  }, [load]);

  const toggleManual = (key: string) => {
    setChecked((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(MANUAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const pushAll = async () => {
    if (!window.confirm("把全站 URL（sitemap 口径）推送给百度与 IndexNow？")) return;
    setPushing(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/seo/baidu-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const d = await res.json();
      setMsg(
        d?.error
          ? "推送失败：" + d.error
          : `已推送 ${d.count} 个 URL。百度：${d.baidu?.ok ? "成功" : "失败"}（${d.baidu?.body || d.baidu?.error || "-"}）；IndexNow：${d.indexnow?.ok ? "成功" : "未配/失败"}`
      );
      await load();
    } catch (e: any) {
      setMsg("推送失败：" + (e?.message || String(e)));
    } finally {
      setPushing(false);
    }
  };

  const samplesBad = (h?.samples || []).filter((s) => s.status !== 200);
  /**
   * 覆盖率判定：只看**真命题** —— sitemap 是否覆盖了全部内容页（产品/新闻/行业/服务/案例）。
   * 不用"应有总数"做阈值：静态页数量是估算值，用它判断会常亮黄灯（实测差 4 条 = 静态页口径误差）。
   */
  const contentUrls = h
    ? h.coverage.liveProducts + h.coverage.liveNews + h.coverage.liveIndustries + h.coverage.liveServices + h.coverage.liveCases
    : 0;
  const coverageOk = !!h && h.sitemap.ok && h.sitemap.urlCount >= contentUrls;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          收录体检
          {h && (
            <span className="text-[11px] font-normal text-gray-400">
              上次体检：{new Date(h.checkedAt).toLocaleString("zh-CN")}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pushAll}
            disabled={pushing}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 disabled:opacity-50"
          >
            <Send size={13} /> {pushing ? "推送中…" : "立即推送全部 URL"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-[#CC0000] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#aa0000] disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> 立即体检
          </button>
        </div>
      </div>

      {msg && <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-600">{msg}</div>}

      {!h ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">{busy ? "体检中…" : "暂无数据"}</div>
      ) : (
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {/* 自动检测项 */}
          <div className="lg:border-r lg:border-gray-100">
            <Row label="robots.txt">
              <Badge ok={h.robots.ok} text={h.robots.ok ? `可读（HTTP ${h.robots.status}）` : h.robots.error || "不可读"} />{" "}
              <Badge ok={h.robots.declaresSitemap} text={h.robots.declaresSitemap ? "已声明 sitemap" : "未声明 sitemap"} />{" "}
              <Badge ok={h.robots.blocksAdminAndApi} text={h.robots.blocksAdminAndApi ? "已屏蔽 /admin /api" : "未屏蔽后台路径"} />
            </Row>
            <Row label="sitemap.xml">
              <Badge ok={h.sitemap.ok} text={h.sitemap.ok ? `${h.sitemap.urlCount} 条 · ${h.sitemap.ms}ms` : h.sitemap.error || "不可读"} />{" "}
              <Badge ok={h.sitemap.hasHreflang} text={h.sitemap.hasHreflang ? "带多语言 hreflang" : "无 hreflang"} />
              {h.baseUrl && (
                <>
                  {" "}
                  <a className="text-blue-600 hover:underline" href={`${h.baseUrl}/sitemap.xml`} target="_blank" rel="noopener noreferrer">
                    打开 <ExternalLink size={11} className="inline" />
                  </a>
                </>
              )}
            </Row>
            <Row label="sitemap-images.xml">
              <Badge ok={h.imagesSitemap.ok} text={h.imagesSitemap.ok ? `可读（HTTP ${h.imagesSitemap.status}）` : "不可读"} />
            </Row>
            <Row label="覆盖率（该收录 vs 已在 sitemap）">
              <Badge
                ok={coverageOk}
                text={
                  coverageOk
                    ? `sitemap 已覆盖全部内容页（内容页 ${contentUrls} 条，含静态页共 ${h.sitemap.urlCount} 条）`
                    : `sitemap 少 ${contentUrls - h.sitemap.urlCount} 条内容页（内容页 ${contentUrls} / sitemap ${h.sitemap.urlCount}）`
                }
              />
              <div className="mt-1 text-[11px] text-gray-400">
                已发布：产品 {h.coverage.liveProducts} · 新闻 {h.coverage.liveNews} · 行业 {h.coverage.liveIndustries} · 服务{" "}
                {h.coverage.liveServices} · 案例 {h.coverage.liveCases} · 静态页 {h.coverage.staticPages}
                {h.coverage.hiddenProducts > 0 && ` ｜ 前台不显示的产品 ${h.coverage.hiddenProducts}（故意不进 sitemap）`}
                {h.coverage.draftNews > 0 && ` ｜ 未发布新闻 ${h.coverage.draftNews}`}
              </div>
            </Row>
            <Row label={`抽样可达性（${h.samples.length} 条）`}>
              <Badge ok={samplesBad.length === 0} text={samplesBad.length === 0 ? "全部 200" : `${samplesBad.length} 条非 200`} />
              {samplesBad.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-left text-[11px] text-red-500">
                  {samplesBad.map((s) => (
                    <li key={s.url}>
                      {s.status} · {s.url}
                    </li>
                  ))}
                </ul>
              )}
            </Row>
            <Row label="推送通道">
              <Badge ok={!!h.config.hasBaiduToken} text={h.config.hasBaiduToken ? "百度已配 token" : "百度未配 token"} />{" "}
              <Badge ok={!!h.config.hasIndexNowKey} text={h.config.hasIndexNowKey ? "IndexNow 已配" : "IndexNow 未配"} />
            </Row>
            <Row label="百度收录站点地址">
              {h.config.baiduSiteUrlValid ? (
                <Badge ok text={h.config.baiduSite || ""} />
              ) : !h.config.baiduSite ? (
                <Badge ok={false} text={`未配置（本次体检已回退 ${h.config.fallbackBaseUrl}；未配置时「百度主动推送」不可用）`} />
              ) : (
                <>
                  <Badge ok={false} text={`后台值异常（${h.config.baiduSite}），本次已回退 ${h.config.fallbackBaseUrl}`} />
                  <div className="mt-1 text-[11px] text-amber-700">
                    ⚠️ 这个值必须填**站点域名**（如 https://www.zuowentech.com）。填错会让「百度主动推送」全部失败 ——
                    请在下方「站点地址」处改正后再推送。
                  </div>
                </>
              )}
            </Row>
            <Row label="页脚 ICP 备案号">
              <Badge
                ok={h.icp.ok}
                text={
                  h.icp.ok
                    ? `已展示：${h.icp.value}`
                    : h.icp.error
                      ? h.icp.error
                      : h.icp.value
                        ? `已填但页脚未展示（showLegal=${h.icp.showLegal ? "true" : "false"}）`
                        : "未配置（后台：品牌 OEM 配置 → ICP 备案号）"
                }
              />
            </Row>
            <Row label="搜索引擎爬虫来访">
              {!h.crawlers.ok ? (
                <Badge ok={false} text={h.crawlers.error || "无法读取 nginx 访问日志"} />
              ) : h.crawlers.byBot.length === 0 ? (
                <Badge ok={false} text={`扫描 ${h.crawlers.scannedLines} 行爬虫请求，暂无记录`} />
              ) : (
                <div className="space-y-1">
                  <div className="flex flex-wrap justify-end gap-1">
                    {h.crawlers.byBot.slice(0, 6).map((b) => (
                      <span
                        key={b.key}
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          b.key === "baidu" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {b.label} {b.count}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    百度：最近来访 {h.crawlers.baidu.lastAt ? h.crawlers.baidu.lastAt.slice(0, 20) : "—"} ·{" "}
                    <span className={h.crawlers.baidu.content > 0 ? "text-green-600" : "text-amber-600"}>
                      {h.crawlers.baidu.content > 0
                        ? `已抓内容页 ${h.crawlers.baidu.content} 次`
                        : "尚未抓过内容页（只停在首页/静态资源）"}
                    </span>
                    {h.crawlers.baidu.suspicious > 0 && ` · 疑似伪装扫描 ${h.crawlers.baidu.suspicious} 次`}
                    {h.crawlers.selfFiltered > 0 && ` · 已排除本机自测 ${h.crawlers.selfFiltered} 次`}
                  </div>
                  {h.crawlers.baidu.perDay.length > 0 && (
                    <div className="text-[11px] text-gray-400">
                      百度按天：
                      {h.crawlers.baidu.perDay
                        .slice(-7)
                        .map((d) => `${d.day.slice(5)} ${d.count}次`)
                        .join(" · ")}
                    </div>
                  )}
                  {h.crawlers.baidu.recent.length > 0 && (
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto text-left text-[11px] text-gray-400">
                      {h.crawlers.baidu.recent.map((r, i) => (
                        <li key={i} className={r.kind === "suspicious" ? "text-amber-600" : ""}>
                          {r.at.slice(0, 20)} · {r.status} · {r.path.slice(0, 60)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="text-[10px] text-gray-300">
                    读 {h.crawlers.files.length} 个日志文件 / {h.crawlers.scannedLines} 行爬虫请求（结果缓存 10 分钟）
                    {/*
                      只在**真的排除过**时才提自身 IP：域名未切到本机时（如阀门站还在解析旧服务器）
                      解析出的 IP 与服务不是一回事，写出来会误导。
                    */}
                    {h.crawlers.selfFiltered > 0 && h.crawlers.selfIp
                      ? ` · 已排除站点自身请求 ${h.crawlers.selfFiltered} 次（${h.crawlers.selfIp}）`
                      : ""}
                  </div>
                </div>
              )}
            </Row>
            <Row label="推送历史（最近 8 次）">
              {h.pushLog.length === 0 ? (
                <span className="text-gray-400">暂无推送记录（本页面板上线后开始记录）</span>
              ) : (
                <ul className="space-y-1 text-[11px]">
                  {h.pushLog.map((p) => (
                    <li key={p.at}>
                      <span className="text-gray-400">{new Date(p.at).toLocaleString("zh-CN")}</span> · {p.count} 个 URL ·{" "}
                      <span className={p.baiduOk ? "text-green-600" : "text-red-500"}>百度{p.baiduOk ? "成功" : "失败"}</span> ·{" "}
                      <span className={p.indexnowOk ? "text-green-600" : "text-gray-400"}>IndexNow{p.indexnowOk ? "成功" : "未配/失败"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Row>
          </div>

          {/* 人工清单（百度平台侧，无 API 可查） */}
          <div>
            <div className="px-3 py-2.5 text-[13px] text-gray-600">
              只能人工在百度平台确认的（勾选状态记在本浏览器）
            </div>
            <ul className="px-3 pb-3">
              {h.manual.map((m) => (
                <li key={m.key} className="flex items-start gap-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={checked.includes(m.key)}
                    onChange={() => toggleManual(m.key)}
                    className="mt-0.5 h-4 w-4 accent-[#CC0000]"
                  />
                  <div>
                    <a
                      href={m.href}
                      target={m.href.startsWith("/") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="text-[13px] text-blue-600 hover:underline"
                    >
                      {m.label}
                    </a>
                    <div className="text-[11px] text-gray-400">{m.hint}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
              说明：索引量/抓取频次/快速收录配额百度未提供查询 API，只能到平台看；本站能自动保证的是
              <b className="text-gray-500">「该收录的页面都能被爬虫看到」</b>
              （sitemap 齐全 + 列表页/首页内链已服务端渲染）。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
