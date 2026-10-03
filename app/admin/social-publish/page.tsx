"use client";

/**
 * 后台 · 社媒一键发布（插件 social-publish）
 * ==========================================================================
 * 三个页签：
 *  ① 发布：选内容（产品中心 / 解决方案 / 新闻）→ 选渠道 → 一键发布；
 *  ② 渠道配置：每个渠道的凭据与开关（密钥框**留空=不修改**）；
 *  ③ 发布记录：最近 200 条（含平台原文报错）。
 *
 * 口径（与 lib/social/channels.ts 的三分类一致）：
 *  · 群机器人 / Webhook 类**开箱可用**（企业微信、钉钉、飞书、Slack、Discord、自定义）；
 *  · Telegram / 微博 / Facebook / LinkedIn / X 需开发者凭据；
 *  · 小红书 / 抖音 / 视频号 / B站 / 知乎 / 公众号**平台不开放第三方发文接口**，
 *    插件只生成文案，你点「复制文案」+「打开发布页」手贴 —— 不做假发布。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, Settings2, History, Copy, ExternalLink, Loader2, RefreshCw, CheckCircle2, XCircle, Info } from "lucide-react";

type TypeKey = "product" | "service" | "news";
const TYPES: { key: TypeKey; label: string }[] = [
  { key: "product", label: "产品中心" },
  { key: "service", label: "解决方案 / 服务" },
  { key: "news", label: "新闻资讯" },
];

interface ContentRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image: string;
  url: string;
}
interface ChannelField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  hint?: string;
}
interface ChannelDef {
  id: string;
  platform: string;
  label: string;
  region: "cn" | "intl";
  kind: "webhook" | "token" | "manual";
  fields: ChannelField[];
  manualUrl?: string;
  maxLength?: number;
  hint?: string;
}
interface LogRow {
  at: string;
  channel: string;
  platform: string;
  contentType: string;
  title: string;
  ok: boolean;
  manual?: boolean;
  message: string;
}
interface ChannelState {
  enabled: boolean;
  config: Record<string, string>;
}

const KIND_LABEL: Record<string, string> = {
  webhook: "开箱可用（群机器人 / Webhook）",
  token: "需开发者凭据",
  manual: "生成文案 + 手动发布",
};

export default function SocialPublishPage() {
  const [tab, setTab] = useState<"publish" | "config" | "log">("publish");
  const [enabled, setEnabled] = useState(true);
  const [channels, setChannels] = useState<ChannelDef[]>([]);
  const [state, setState] = useState<Record<string, ChannelState>>({});
  const [log, setLog] = useState<LogRow[]>([]);

  const [type, setType] = useState<TypeKey>("product");
  const [list, setList] = useState<ContentRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [targets, setTargets] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [manualTexts, setManualTexts] = useState<{ platform: string; text: string; url?: string }[]>([]);

  const loadMeta = useCallback(async () => {
    const r = await fetch("/api/admin/social-publish", { cache: "no-store" });
    const d = await r.json();
    if (d?.ok) {
      setEnabled(!!d.enabled);
      setChannels(d.channels || []);
      setState(d.state?.channels || {});
      setLog(d.state?.log || []);
    }
  }, []);

  const loadList = useCallback(async (t: TypeKey) => {
    setLoadingList(true);
    setPicked({});
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/social-publish?type=${t}`, { cache: "no-store" });
      const d = await r.json();
      setList(d?.list || []);
      // 读取失败要如实说出来（否则"接口报错"会伪装成"没有内容"）
      if (d && d.ok === false) setMsg({ ok: false, text: `读取内容失败：${d.error || "未知原因"}` });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  /**
   * 支持从别处**带参跳转**过来直接预选（owner 2026-10-01 需求 1）：
   *   `/admin/social-publish?type=product&id=123`
   * 来源：后台内容列表每行的「发布到社媒」按钮 / 前台详情页的「发布到社媒」。
   * 用 window.location 读参（不用 useSearchParams）—— 后台页无需为它再加 Suspense 边界。
   */
  const [presetId, setPresetId] = useState<string>("");
  /** 行稳定标识：优先 id，缺失时退回 slug（**绝不能出现多行同 key**，否则勾一个会全勾上） */
  const keyOf = (row: ContentRow) => (row.id && row.id !== "undefined" ? row.id : row.slug);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("type");
    if (t === "product" || t === "service" || t === "news") setType(t);
    setPresetId(sp.get("id") || "");
  }, []);

  useEffect(() => {
    loadList(type);
  }, [type, loadList]);

  // 列表到位后把预选项勾上
  useEffect(() => {
    if (!presetId || !list.length) return;
    const hit = list.find((x) => x.id === presetId || x.slug === presetId);
    if (hit) {
      setPicked({ [keyOf(hit)]: true });
      setMsg({ ok: true, text: `已预选：${hit.title || hit.slug}` });
    }
  }, [presetId, list]);

  const filtered = useMemo(
    () => (q.trim() ? list.filter((x) => (x.title + x.summary).toLowerCase().includes(q.trim().toLowerCase())) : list),
    [list, q]
  );
  const pickedIds = Object.keys(picked).filter((k) => picked[k]);
  const targetIds = Object.keys(targets).filter((k) => targets[k]);

  const saveChannels = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/social-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-channels", channels: state }),
      });
      const d = await r.json();
      if (d?.ok) {
        setMsg({ ok: true, text: "渠道配置已保存" });
        await loadMeta();
      } else {
        setMsg({ ok: false, text: d?.error || "保存失败" });
      }
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setMsg(null);
    setResults([]);
    setManualTexts([]);
    try {
      const items = pickedIds.map((id) => ({ type, id }));
      if (items.some((it) => !it.id || it.id === "undefined")) {
        setMsg({ ok: false, text: "内容标识异常（id 缺失），已阻止发布 —— 请刷新页面重试" });
        return;
      }
      const r = await fetch("/api/admin/social-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", items, channels: targetIds }),
      });
      const d = await r.json();
      if (d?.ok) {
        setResults(d.results || []);
        const latest: Record<string, any> = {};
        for (const m of (d.results || []).filter((x: any) => x.manual && x.text)) latest[m.platform] = m;
        setManualTexts(
          Object.values(latest).map((m: any) => ({
            platform: m.platform,
            text: m.text,
            url: channels.find((c) => c.id === m.channel)?.manualUrl,
          }))
        );
        setMsg({ ok: d.summary?.fail === 0, text: `发布完成：成功 ${d.summary?.ok} / 失败 ${d.summary?.fail}` });
        await loadMeta();
      } else {
        setMsg({ ok: false, text: d?.error || "发布失败" });
      }
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(
    () => ({
      cn: channels.filter((c) => c.region === "cn"),
      intl: channels.filter((c) => c.region === "intl"),
    }),
    [channels]
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-dark">社媒一键发布</h1>
          <p className="text-sm text-dark-400 mt-1">
            把产品 / 解决方案 / 新闻一键发到国内与海外渠道；无开放发文接口的平台自动生成文案供手动发布。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!enabled && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
              插件未启用：能力市场 → 社媒一键发布
            </span>
          )}
          <button onClick={loadMeta} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 border border-dark-100 rounded-lg hover:bg-dark-50">
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-dark-100">
        {[
          { k: "publish" as const, label: "发布", icon: <Send size={15} /> },
          { k: "config" as const, label: "渠道配置", icon: <Settings2 size={15} /> },
          { k: "log" as const, label: "发布记录", icon: <History size={15} /> },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.k ? "border-primary text-primary" : "border-transparent text-dark-400 hover:text-dark"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</div>
      )}

      {tab === "publish" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-xl border border-dark-100">
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-dark-100">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${type === t.key ? "bg-primary text-white" : "bg-dark-50 text-dark-500 hover:bg-dark-100"}`}
                >
                  {t.label}
                </button>
              ))}
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索标题 / 摘要"
                className="ml-auto w-52 px-3 py-1.5 text-sm border border-dark-100 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() =>
                  setPicked(
                    filtered.length > 0 && pickedIds.length === filtered.length
                      ? {}
                      : Object.fromEntries(filtered.map((x) => [keyOf(x), true]))
                  )
                }
                className="text-xs px-3 py-1.5 border border-dark-100 rounded-lg hover:bg-dark-50"
              >
                {filtered.length > 0 && pickedIds.length === filtered.length ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-dark-50">
              {loadingList ? (
                <div className="p-8 text-center text-dark-400 text-sm">
                  <Loader2 className="animate-spin inline" size={16} /> 加载中…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-dark-400 text-sm">没有内容</div>
              ) : (
                filtered.map((row) => (
                  <label key={keyOf(row)} className="flex items-start gap-3 p-4 hover:bg-dark-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!picked[keyOf(row)]}
                      onChange={(e) => setPicked((p) => ({ ...p, [keyOf(row)]: e.target.checked }))}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-dark truncate">{row.title || row.slug}</div>
                      <div className="text-xs text-dark-400 mt-0.5 line-clamp-2">{row.summary}</div>
                      <div className="text-[11px] text-dark-300 mt-1 truncate">{row.url}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-dark-100 p-4">
              <div className="text-sm font-semibold text-dark mb-3">发布渠道（已选 {targetIds.length}）</div>
              {[
                { label: "国内", arr: grouped.cn },
                { label: "海外", arr: grouped.intl },
              ].map((g) => (
                <div key={g.label} className="mb-3">
                  <div className="text-xs text-dark-400 mb-1.5">{g.label}</div>
                  <div className="space-y-1.5">
                    {g.arr.map((c) => {
                      const ready = !!state[c.id]?.enabled;
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg border ${
                            ready ? "border-dark-100" : "border-dashed border-dark-100 opacity-70"
                          } cursor-pointer`}
                        >
                          <input
                            type="checkbox"
                            checked={!!targets[c.id]}
                            onChange={(e) => setTargets((t) => ({ ...t, [c.id]: e.target.checked }))}
                          />
                          <span className="flex-1 truncate">{c.platform}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              c.kind === "manual" ? "bg-amber-50 text-amber-600" : c.kind === "webhook" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {c.kind === "manual" ? "手动" : c.kind === "webhook" ? "开箱" : "凭据"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={publish}
              disabled={busy || !pickedIds.length || !targetIds.length}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-medium disabled:opacity-40"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              一键发布（{pickedIds.length} 条 → {targetIds.length} 渠道）
            </button>

            {results.length > 0 && (
              <div className="bg-white rounded-xl border border-dark-100 p-4 max-h-72 overflow-y-auto">
                <div className="text-sm font-semibold text-dark mb-2">本次结果</div>
                <div className="space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      {r.ok ? <CheckCircle2 size={14} className="text-green-600 mt-0.5" /> : <XCircle size={14} className="text-red-500 mt-0.5" />}
                      <span className="text-dark-500">
                        <b className="text-dark">{r.platform}</b>：{r.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {manualTexts.length > 0 && (
              <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 space-y-3">
                <div className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <Info size={14} /> 需要手动发布的平台（文案已生成）
                </div>
                {manualTexts.map((m) => (
                  <div key={m.platform} className="bg-white rounded-lg border border-amber-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-dark">{m.platform}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigator.clipboard?.writeText(m.text)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-dark-100 rounded hover:bg-dark-50"
                        >
                          <Copy size={11} /> 复制文案
                        </button>
                        {m.url && (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-primary text-white rounded"
                          >
                            <ExternalLink size={11} /> 打开发布页
                          </a>
                        )}
                      </div>
                    </div>
                    <pre className="text-[11px] text-dark-500 whitespace-pre-wrap max-h-32 overflow-y-auto">{m.text}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="space-y-4">
          <div className="text-sm text-dark-400 flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-lg p-3">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              密钥框<b>留空表示不修改</b>（不会把已保存的值抹掉）。群机器人 / Webhook 类填一个 URL 即可用；
              小红书 / 抖音 / 视频号 / B站 / 知乎 / 公众号平台不开放第三方发文接口，本插件不假装发布，只生成文案。
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {channels.map((c) => {
              const conf = state[c.id] || { enabled: false, config: {} };
              const hint = c.hint || c.fields.find((f) => f.hint)?.hint || "";
              return (
                <div key={c.id} className="bg-white rounded-xl border border-dark-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-dark">{c.platform}</div>
                      <div className="text-[11px] text-dark-400">
                        {c.label} · {KIND_LABEL[c.kind]}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-dark-500">
                      <input
                        type="checkbox"
                        checked={!!conf.enabled}
                        onChange={(e) => setState((s) => ({ ...s, [c.id]: { ...conf, enabled: e.target.checked } }))}
                      />
                      启用
                    </label>
                  </div>
                  <div className="space-y-2">
                    {c.fields.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs text-dark-400">{f.label}</label>
                        <input
                          type={f.secret ? "password" : "text"}
                          placeholder={f.placeholder || (f.secret ? "留空表示不修改" : "")}
                          value={conf.config?.[f.key] ?? ""}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              [c.id]: { ...conf, config: { ...(conf.config || {}), [f.key]: e.target.value } },
                            }))
                          }
                          className="mt-1 w-full px-3 py-2 text-sm border border-dark-100 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>
                  {hint && <div className="text-[11px] text-dark-300 mt-2">{hint}</div>}
                </div>
              );
            })}
          </div>
          <button
            onClick={saveChannels}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} 保存全部渠道配置
          </button>
        </div>
      )}

      {tab === "log" && (
        <div className="bg-white rounded-xl border border-dark-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-dark-50 text-dark-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-2.5">时间</th>
                  <th className="text-left px-4 py-2.5">渠道</th>
                  <th className="text-left px-4 py-2.5">内容</th>
                  <th className="text-left px-4 py-2.5">结果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {log.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-dark-400">
                      还没有发布记录
                    </td>
                  </tr>
                ) : (
                  log.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-xs text-dark-400 whitespace-nowrap">{new Date(l.at).toLocaleString("zh-CN")}</td>
                      <td className="px-4 py-2.5 text-xs">{l.platform}</td>
                      <td className="px-4 py-2.5 text-xs max-w-md truncate" title={l.title}>
                        {l.title}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={l.ok ? "text-green-600" : "text-red-500"}>
                          {l.manual ? "已生成文案（手动）" : l.ok ? "成功" : "失败"}
                        </span>
                        <span className="text-dark-400 ml-2">{l.message}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
