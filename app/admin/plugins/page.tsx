"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Puzzle, Power, Settings2, ExternalLink, ShieldCheck, CheckCircle2, XCircle,
  KeyRound, Search, ListChecks, AlertTriangle, Lock, Store, RefreshCw, Copy, Check, Download, Tag, X,
} from "lucide-react";
import PluginEventsPanel from "@/components/admin/PluginEventsPanel";
import { PLUGIN_CATEGORY_LABELS } from "@/lib/plugins/registry";

interface ConfigField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface PluginItem {
  key: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  version: string;
  builtin: boolean;
  defaultEnabled: boolean;
  planned?: boolean;
  configurable: boolean;
  configFields?: ConfigField[];
  permissions?: string[];
  adminUrl?: string;
  adminUrls?: { label: string; href: string }[];
  isContentSection?: boolean;
  sections?: { label: string; href: string }[];
  features?: string[];
  impact?: string;
  enabled: boolean;
  config: Record<string, any>;
  showInSidebar?: boolean;
  installedAt?: string;
  marketSource?: "remote" | "builtin";
  price?: number;
  paid?: boolean;
  market?: boolean;
}

interface MarketPlugin {
  key: string;
  name: string;
  description: string;
  category: string;
  version: string;
  builtin: boolean;
  defaultEnabled: boolean;
  configurable: boolean;
  planned?: boolean;
  features: string[];
  impact?: string;
  adminUrl?: string;
  adminUrls?: { label: string; href: string }[];
  price?: number;
  paid?: boolean;
  market?: boolean;
  marketSource?: "remote" | "builtin";
}

interface Catalog {
  plugins: MarketPlugin[];
  source: "remote" | "builtin";
  cached: boolean;
  installedKeys: string[];
  activatedKeys: string[];
}

/** 插件 category → 展示分组名（按业务口径归组） */
const GROUP_LABEL: Record<string, string> = {
  ai: "AI 能力",
  marketing: "营销与商机",
  seo: "SEO 与数据",
  data: "SEO 与数据",
  content: "内容管理",
  system: "系统运维",
  integration: "系统运维",
};
const GROUP_ORDER = ["AI 能力", "营销与商机", "SEO 与数据", "内容管理", "系统运维", "其他"];

const groupOf = (p: PluginItem): string => GROUP_LABEL[p.category] || "其他";

const CATEGORY_OPTIONS = Object.entries(PLUGIN_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export default function PluginsPage() {
  // ===== 视图 Tab：插件市场（默认）/ 已安装管理 =====
  const [tab, setTab] = useState<"market" | "installed">("market");

  // ===== 已安装管理数据（/api/admin/plugins）=====
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);

  // ===== 市场目录数据（/api/admin/plugin-market）=====
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  const [error, setError] = useState("");

  // 市场视图筛选
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // 已安装视图筛选
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled" | "planned">("all");

  // 配置 / 元信息弹窗
  const [configTarget, setConfigTarget] = useState<PluginItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [metaTarget, setMetaTarget] = useState<PluginItem | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaShowSidebar, setMetaShowSidebar] = useState(true);

  // 付费开通弹窗
  const [activateTarget, setActivateTarget] = useState<MarketPlugin | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");

  // 生成兑换码弹窗
  const [genOpen, setGenOpen] = useState(false);
  const [genKey, setGenKey] = useState("");
  const [genExp, setGenExp] = useState("30d");
  const [genResult, setGenResult] = useState("");
  const [genError, setGenError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // 远程目录 URL 配置弹窗
  const [urlOpen, setUrlOpen] = useState(false);
  const [marketUrl, setMarketUrl] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);
  const [urlError, setUrlError] = useState("");

  const loadInstalled = async () => {
    try {
      const r = await fetch("/api/admin/plugins");
      const d = await r.json();
      if (d.ok) setPlugins(d.list);
    } catch {
      setError("加载已安装插件列表失败");
    } finally {
      setPluginsLoading(false);
    }
  };

  const loadCatalog = async (force = false) => {
    try {
      const r = await fetch(`/api/admin/plugin-market${force ? "?refresh=1" : ""}`);
      const d = await r.json();
      if (d.plugins) {
        setCatalog({
          plugins: d.plugins,
          source: d.source,
          cached: !!d.cached,
          installedKeys: d.installedKeys || [],
          activatedKeys: d.activatedKeys || [],
        });
      }
    } catch {
      setError("加载插件市场失败");
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    loadInstalled();
    loadCatalog();
  }, []);

  const refreshAll = () => {
    loadInstalled();
    loadCatalog(true);
  };

  // ===== 市场视图：过滤 =====
  const marketPlugins = catalog?.plugins || [];
  const marketFiltered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return marketPlugins.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (!kw) return true;
      const haystack = [p.name, p.description, p.key, (p.features || []).join(" "), p.impact || ""].join(" ").toLowerCase();
      return haystack.includes(kw);
    });
  }, [marketPlugins, search, catFilter]);

  const marketStats = useMemo(() => {
    const installed = marketPlugins.filter((p) => (catalog?.installedKeys || []).includes(p.key)).length;
    const activated = marketPlugins.filter((p) => (catalog?.activatedKeys || []).includes(p.key)).length;
    const paid = marketPlugins.filter((p) => p.paid).length;
    return { total: marketPlugins.length, installed, activated, paid };
  }, [marketPlugins, catalog]);

  // ===== 已安装视图：仅 builtin 全部 + 已安装远程 =====
  const installedKeys = catalog?.installedKeys || [];
  const activatedKeys = catalog?.activatedKeys || [];
  const installedOnly = useMemo(() => plugins.filter((p) => p.builtin || installedKeys.includes(p.key)), [plugins, installedKeys]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return installedOnly
      .filter((p) => {
        if (p.isContentSection) return false;
        if (filter === "planned") return !!p.planned;
        if (filter === "enabled") return p.enabled && !p.planned;
        if (filter === "disabled") return !p.enabled && !p.planned;
        return true;
      })
      .filter((p) => {
        if (!kw) return true;
        const haystack = [p.name, p.description, p.key, (p.features || []).join(" "), p.impact || ""].join(" ").toLowerCase();
        return haystack.includes(kw);
      });
  }, [installedOnly, filter, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PluginItem[]> = {};
    filtered.forEach((p) => {
      const g = groupOf(p);
      (map[g] = map[g] || []).push(p);
    });
    return GROUP_ORDER.filter((g) => map[g] && map[g].length > 0).map((g) => ({ group: g, list: map[g] }));
  }, [filtered]);

  const stats = useMemo(() => {
    const base = installedOnly.filter((p) => !p.isContentSection);
    const total = base.length;
    const enabled = base.filter((p) => p.enabled && !p.planned).length;
    const disabled = base.filter((p) => !p.enabled && !p.planned).length;
    const planned = base.filter((p) => !!p.planned).length;
    return { total, enabled, disabled, planned };
  }, [installedOnly]);

  const FILTER_TABS: { key: "all" | "enabled" | "disabled" | "planned"; label: string; count: number }[] = [
    { key: "all", label: "全部", count: stats.total },
    { key: "enabled", label: "已启用", count: stats.enabled },
    { key: "disabled", label: "已停用", count: stats.disabled },
    { key: "planned", label: "规划中", count: stats.planned },
  ];

  // ===== 动作 =====

  const toggle = async (p: PluginItem) => {
    if (p.planned) return;
    // 付费插件未开通 → 锁定（UI 层兜底，API 层同样防御）
    const man = marketPlugins.find((c) => c.key === p.key);
    if (man?.paid && !activatedKeys.includes(p.key)) {
      setError("该功能需付费开通：请在插件市场输入兑换码后启用");
      return;
    }
    setPlugins((prev) => prev.map((x) => (x.key === p.key ? { ...x, enabled: !x.enabled } : x)));
    try {
      const r = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", key: p.key }),
      });
      const d = await r.json();
      if (!d.ok) { setError("切换失败：" + (d.error || "")); loadInstalled(); }
    } catch {
      setError("网络异常"); loadInstalled();
    }
  };

  const installPlugin = async (p: MarketPlugin): Promise<boolean> => {
    setError("");
    try {
      const r = await fetch("/api/admin/plugin-market/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: p.key }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "安装失败");
      refreshAll();
      return true;
    } catch (e: any) {
      setError(e.message || "安装失败");
      return false;
    }
  };

  const uninstallPlugin = async (p: PluginItem) => {
    if (!window.confirm(`确认卸载「${p.name}」？卸载后其启停状态将被移除，内置插件不可卸载。`)) return;
    setError("");
    try {
      const r = await fetch("/api/admin/plugin-market/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: p.key }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "卸载失败");
      refreshAll();
    } catch (e: any) {
      setError(e.message || "卸载失败");
    }
  };

  const submitActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);
    setActivateError("");
    try {
      const r = await fetch("/api/admin/plugin-market/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activateTarget.key, code: activateCode.trim() }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "开通失败");
      setActivateTarget(null);
      setActivateCode("");
      refreshAll();
    } catch (e: any) {
      setActivateError(e.message || "开通失败");
    } finally {
      setActivating(false);
    }
  };

  const submitGenerate = async () => {
    if (!genKey) return;
    setGenerating(true);
    setGenError("");
    setGenResult("");
    try {
      const r = await fetch("/api/admin/plugin-market/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: genKey, exp: genExp }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "生成失败");
      setGenResult(d.code);
    } catch (e: any) {
      setGenError(e.message || "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!genResult) return;
    try {
      await navigator.clipboard.writeText(genResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 剪贴板不可用时忽略 */ }
  };

  const openUrlModal = async () => {
    setUrlError("");
    try {
      const r = await fetch("/api/admin/plugin-market/url");
      const d = await r.json();
      setMarketUrl(d.url || "");
    } catch {
      setMarketUrl("");
    }
    setUrlOpen(true);
  };

  const saveUrl = async () => {
    setUrlSaving(true);
    setUrlError("");
    try {
      const r = await fetch("/api/admin/plugin-market/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: marketUrl }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "保存失败");
      setUrlOpen(false);
      setMarketUrl("");
      loadCatalog(true);
    } catch (e: any) {
      setUrlError(e.message || "保存失败");
    } finally {
      setUrlSaving(false);
    }
  };

  const openConfig = (p: PluginItem) => {
    setConfigTarget(p);
    setConfigForm({ ...(p.config || {}) });
  };

  const openMeta = (p: PluginItem) => {
    setMetaTarget(p);
    setMetaName(p.name || "");
    setMetaShowSidebar(p.showInSidebar !== false);
  };

  const saveMeta = async () => {
    if (!metaTarget) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "meta", key: metaTarget.key, name: metaName, showInSidebar: metaShowSidebar }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "保存失败");
      setMetaTarget(null);
      loadInstalled();
    } catch (e: any) {
      setError(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async () => {
    if (!configTarget) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/admin/plugins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configTarget.key, config: configForm }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "保存失败");
      setConfigTarget(null);
      loadInstalled();
    } catch (e: any) {
      setError(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (f: ConfigField) => {
    const val = configForm[f.key];
    if (f.type === "boolean") {
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 mt-1">
          <input type="checkbox" checked={!!val} onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.checked })} className="w-4 h-4" />
          {f.label}
        </label>
      );
    }
    if (f.type === "select") {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
          <select value={val || ""} onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
        {f.type === "textarea" ? (
          <textarea rows={3} value={val || ""} onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
        ) : (
          <input type={f.type === "password" ? "password" : "text"} value={val || ""} placeholder={f.placeholder}
            onChange={(e) => setConfigForm({ ...configForm, [f.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
        )}
      </div>
    );
  };

  // ===== 市场卡片 =====
  const marketStatus = (p: MarketPlugin): "fresh" | "installed" | "activated" => {
    if (activatedKeys.includes(p.key)) return "activated";
    if (installedKeys.includes(p.key)) return "installed";
    return "fresh";
  };

  const marketStatusBadge = (p: MarketPlugin) => {
    const st = marketStatus(p);
    if (st === "activated") return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium"><CheckCircle2 size={11} /> 已开通</span>;
    if (st === "installed") return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium"><Download size={11} /> 已安装</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">未安装</span>;
  };

  const sourceBadge = (p: MarketPlugin) => (
    p.marketSource === "remote" ? (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100"><Store size={10} /> 远程</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200"><Tag size={10} /> 内置</span>
    )
  );

  const priceTag = (p: MarketPlugin) => (
    p.paid ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><Lock size={11} /> ¥{p.price || 0} · 付费</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={11} /> 免费</span>
    )
  );

  // ===== 已安装卡片状态徽章 =====
  const statusBadge = (p: PluginItem) => {
    if (p.planned) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">规划中</span>;
    if (p.enabled) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium"><CheckCircle2 size={11} /> 已启用</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium"><XCircle size={11} /> 已停用</span>;
  };

  const paidLocked = (p: PluginItem) => {
    const man = marketPlugins.find((c) => c.key === p.key);
    return !!man?.paid && !activatedKeys.includes(p.key);
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Puzzle size={24} className="text-red-600" /> 插件市场
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            插件市场：浏览内置与远程市场能力并安装；已安装管理：统一启停、配置与维护。付费插件需兑换码开通后方可启停。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {catalog?.source === "remote" && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
              <RefreshCw size={11} /> 远程目录{catalog.cached ? "（缓存 5 分钟）" : ""}
            </span>
          )}
          <button onClick={openUrlModal}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> 远程目录配置
          </button>
          <button onClick={() => { setGenOpen(true); setGenResult(""); setGenError(""); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
            <KeyRound size={15} /> 生成兑换码
          </button>
          <Link href="/admin/gateway"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            <KeyRound size={15} /> API 网关管理
          </Link>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        <button onClick={() => setTab("market")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "market" ? "border-red-600 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          插件市场
          {!marketLoading && <span className="ml-1.5 text-xs text-gray-400">({marketStats.total})</span>}
        </button>
        <button onClick={() => setTab("installed")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "installed" ? "border-red-600 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          已安装管理
          {!pluginsLoading && <span className="ml-1.5 text-xs text-gray-400">({stats.total})</span>}
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {tab === "market"
            ? `共 ${marketStats.total} 条：已安装 ${marketStats.installed} · 已开通付费 ${marketStats.activated} · 付费条目 ${marketStats.paid}`
            : `共 ${stats.total} 个已安装能力：启用 ${stats.enabled} / 停用 ${stats.disabled}`}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md px-4 py-2 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* ================= 插件市场视图 ================= */}
      {tab === "market" && (
        <>
          {/* 搜索 + 分类筛选 */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索插件名称 / 描述 / 功能点..."
                className="w-72 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="all">全部分类</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <span className="ml-auto text-xs text-gray-400">
              来源：{catalog?.source === "remote" ? "远程市场目录" : "内置目录"}
            </span>
          </div>

          {marketLoading ? (
            <div className="text-gray-500 py-10">市场加载中...</div>
          ) : marketFiltered.length === 0 ? (
            <div className="bg-gray-50 rounded-lg text-gray-400 text-sm py-10 text-center">
              {search ? "没有匹配的插件，试试其他关键词" : "市场暂无插件"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {marketFiltered.map((p) => {
                const st = marketStatus(p);
                return (
                  <div key={p.key} className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col transition-shadow hover:shadow-md ${st === "activated" ? "border-green-200" : st === "installed" ? "border-blue-200" : "border-gray-200"}`}>
                    {/* 头部：名称 + 来源 + 状态 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                          {sourceBadge(p)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          v{p.version} · {PLUGIN_CATEGORY_LABELS[p.category as keyof typeof PLUGIN_CATEGORY_LABELS] || p.category}
                          {p.configurable ? " · 可配置" : ""}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {marketStatusBadge(p)}
                        {priceTag(p)}
                      </div>
                    </div>

                    {/* 描述 */}
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">{p.description}</p>

                    {/* 功能点 */}
                    {p.features && p.features.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mb-1.5">
                          <ListChecks size={12} /> 功能点
                        </div>
                        <ul className="flex flex-wrap gap-1.5">
                          {p.features.map((f) => (
                            <li key={f} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 远程条目待部署提示 */}
                    {p.marketSource === "remote" && (
                      <div className="mt-3 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        <span>功能代码待部署：当前为市场目录条目（能力开关 + 入口 + 说明），实际功能需随部署提供。</span>
                      </div>
                    )}

                    {/* 操作区 */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                      {st === "fresh" && (
                        <button onClick={async () => {
                          const ok = await installPlugin(p);
                          // 付费插件：安装成功后直接弹出「付费开通」，一步到位
                          if (ok && p.paid) {
                            setActivateTarget(p);
                            setActivateCode("");
                            setActivateError("");
                          }
                        }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
                          <Download size={12} /> {p.paid ? "安装并开通" : "安装"}
                        </button>
                      )}
                      {st === "installed" && !p.paid && (
                        <button onClick={() => setTab("installed")}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors">
                          <CheckCircle2 size={12} /> 已安装 ✓
                        </button>
                      )}
                      {st === "installed" && p.paid && (
                        <button onClick={() => { setActivateTarget(p); setActivateCode(""); setActivateError(""); }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                          <KeyRound size={12} /> 付费开通
                        </button>
                      )}
                      {st === "activated" && (
                        <button onClick={() => setTab("installed")}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 border border-green-200 rounded-md hover:bg-green-200 transition-colors">
                          <CheckCircle2 size={12} /> 已开通 ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================= 已安装管理视图 ================= */}
      {tab === "installed" && (
        <>
          {/* 搜索 + 状态筛选 */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索插件名称 / 描述 / 功能点..."
                className="w-72 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>
            {FILTER_TABS.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                  filter === t.key
                    ? (t.key === "planned" ? "bg-amber-500 text-white" : "bg-gray-900 text-white")
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t.label} <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>

          {pluginsLoading ? (
            <div className="text-gray-500 py-10">加载中...</div>
          ) : grouped.length === 0 ? (
            <div className="bg-gray-50 rounded-lg text-gray-400 text-sm py-10 text-center">
              {search ? "没有匹配的插件，试试其他关键词" : filter === "planned" ? "暂无规划中插件" : filter === "disabled" ? "暂无已停用插件" : filter === "enabled" ? "暂无已启用插件" : "暂无已安装插件，请先到插件市场安装"}
            </div>
          ) : (
            grouped.map(({ group, list }) => {
              const groupEnabled = list.filter((p) => p.enabled && !p.planned).length;
              return (
                <div key={group} className="mb-8">
                  <h2 className="text-sm font-semibold text-gray-900 tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 rounded bg-red-600 inline-block" />
                    {group}
                    <span className="text-xs font-normal text-gray-400">· {list.length} 个（{groupEnabled} 已启用）</span>
                    {group === "AI 能力" && (
                      <Link href="/admin/ai-features"
                        className="ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        AI 功能点开关 <ExternalLink size={10} />
                      </Link>
                    )}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {list.map((p) => {
                      const locked = paidLocked(p);
                      return (
                        <div key={p.key} className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col transition-shadow hover:shadow-md ${p.enabled ? "border-green-200" : p.planned ? "border-dashed border-amber-300 bg-amber-50/40" : "border-gray-200 opacity-90"}`}>
                          {/* 头部：名称 + 状态徽章 + 启停开关 */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                                {statusBadge(p)}
                                {p.marketSource === "remote" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100"><Store size={10} /> 远程</span>
                                )}
                                {p.paid && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                                    <Lock size={10} /> ¥{p.price || 0} 付费{locked ? "·未开通" : "·已开通"}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">v{p.version} · {p.categoryLabel}{!p.builtin ? " · 扩展" : ""}{p.configurable ? " · 可配置" : ""}</div>
                            </div>
                            <button
                              onClick={() => locked ? setError("该功能需付费开通：请在插件市场输入兑换码后启用") : toggle(p)}
                              disabled={!!p.planned || locked}
                              title={locked ? "该功能需付费开通" : (p.planned ? "该插件为规划中能力，功能尚未实现" : (p.enabled ? "停用" : "启用"))}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${locked ? "bg-amber-300" : p.enabled ? "bg-green-500" : "bg-gray-300"} ${p.planned ? "opacity-40 cursor-not-allowed" : locked ? "cursor-not-allowed" : ""}`}
                              aria-label={locked ? "需付费开通" : (p.enabled ? "停用" : "启用")}
                            >
                              {locked ? (
                                <Lock size={10} className="absolute left-1/2 -translate-x-1/2 text-white" />
                              ) : (
                                <Power size={10} className={`absolute text-white transition-opacity ${p.enabled ? "opacity-100 left-1" : "opacity-0"}`} />
                              )}
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${locked ? "translate-x-0.5" : p.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                            </button>
                          </div>

                          {/* 描述 */}
                          <p className="text-xs text-gray-500 mt-3 leading-relaxed">{p.description}</p>

                          {/* 功能点 */}
                          <div className="mt-3">
                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mb-1.5">
                              <ListChecks size={12} /> 功能点
                            </div>
                            {(p.features && p.features.length > 0) ? (
                              <ul className="flex flex-wrap gap-1.5">
                                {p.features.map((f) => (
                                  <li key={f} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{f}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-[11px] text-gray-400">暂无功能点说明</div>
                            )}
                          </div>

                          {/* 启用影响 */}
                          <div className="mt-3">
                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mb-1">
                              <AlertTriangle size={12} /> 启用影响
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1.5">
                              {p.impact || "未说明启用影响"}
                            </p>
                          </div>

                          {p.planned && (
                            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              尚未开发：此能力已列入路线图，开发完成后自动开放（含后台入口与开关）。
                            </div>
                          )}

                          {p.marketSource === "remote" && (
                            <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1">
                              功能代码待部署：当前为市场目录条目，实际功能需随部署提供。
                            </div>
                          )}

                          {/* 操作区 */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button onClick={() => openMeta(p)}
                              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                              <Settings2 size={12} /> 编辑
                            </button>
                            {p.configurable && (
                              <button onClick={() => openConfig(p)}
                                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                                <Settings2 size={12} /> 配置
                              </button>
                            )}
                            {p.adminUrls && p.adminUrls.length > 0 ? (
                              p.adminUrls.map((a) => (
                                <Link key={a.href} href={a.href}
                                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                                  <ExternalLink size={12} /> {a.label}
                                </Link>
                              ))
                            ) : p.adminUrl ? (
                              <Link href={p.adminUrl}
                                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                                <ExternalLink size={12} /> 管理入口
                              </Link>
                            ) : (
                              <span className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">能力型 · 无独立管理页</span>
                            )}
                            {p.marketSource === "remote" && (
                              <button onClick={() => uninstallPlugin(p)}
                                className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 rounded text-red-600 hover:bg-red-50">
                                <XCircle size={12} /> 卸载
                              </button>
                            )}
                          </div>

                          {p.permissions && p.permissions.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                              <ShieldCheck size={12} /> {p.permissions.join(" · ")}
                            </div>
                          )}

                          {p.sections && p.sections.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-100">
                              <div className="text-[11px] text-gray-400 mb-1.5">衍生栏目（通用内容模型，可单独启停）</div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {p.sections.map((sec) => (
                                  <Link key={sec.href} href={sec.href}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 truncate">
                                    {sec.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ===== 付费开通弹窗 ===== */}
      {activateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setActivateTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">付费开通 · {activateTarget.name}</h3>
            <p className="text-xs text-gray-500 mb-4">
              输入兑换码开通「{activateTarget.key}」付费能力（{activateTarget.price ? `¥${activateTarget.price} · ` : ""}一次性授权）。开通后可正常启停。
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">兑换码</label>
              <input
                value={activateCode}
                onChange={(e) => setActivateCode(e.target.value)}
                placeholder="粘贴兑换码（base64url 格式，勿断行）"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
            {activateError && <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{activateError}</div>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setActivateTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={submitActivate} disabled={activating || !activateCode.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {activating ? "开通中..." : "确认开通"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 生成兑换码弹窗 ===== */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setGenOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">生成付费插件兑换码</h3>
            <p className="text-xs text-gray-500 mb-4">仅管理员可用。兑换码由 HMAC-SHA256 签名（密钥 PLUGIN_MARKET_SECRET），可指定有效期。</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">付费插件</label>
                <select value={genKey} onChange={(e) => setGenKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  <option value="">请选择付费插件...</option>
                  {marketPlugins.filter((p) => p.paid).map((p) => (
                    <option key={p.key} value={p.key}>{p.name}（{p.key} · ¥{p.price || 0}）</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">有效期</label>
                <select value={genExp} onChange={(e) => setGenExp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  <option value="30d">30 天</option>
                  <option value="90d">90 天</option>
                  <option value="365d">365 天</option>
                  <option value="permanent">永久</option>
                  <option value="custom">自定义日期（YYYY-MM-DD）</option>
                </select>
                {genExp === "custom" && (
                  <input
                    type="date"
                    value={genExp === "custom" ? "" : genExp}
                    onChange={(e) => setGenExp(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  />
                )}
              </div>
              {genError && <div className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{genError}</div>}
              {genResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">兑换码</span>
                    <button onClick={copyCode}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
                      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />} {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono break-all text-gray-800 leading-relaxed">{genResult}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setGenOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">关闭</button>
              <button onClick={submitGenerate} disabled={generating || !genKey}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50">
                {generating ? "生成中..." : "生成兑换码"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 远程目录配置弹窗 ===== */}
      {urlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUrlOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">远程市场目录配置</h3>
            <p className="text-xs text-gray-500 mb-4">
              填写返回 <code className="text-red-600 bg-red-50 px-1 rounded">{"{plugins:[...]}"}</code> JSON 的远程目录 URL；
              留空保存 = 清除配置，回退内置目录。目录缓存 5 分钟。
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">目录 JSON URL</label>
              <input
                value={marketUrl}
                onChange={(e) => setMarketUrl(e.target.value)}
                placeholder="https://example.com/plugin-market.json"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
            {urlError && <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{urlError}</div>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setUrlOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={saveUrl} disabled={urlSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {urlSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 插件元信息编辑弹窗 ===== */}
      {metaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMetaTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">编辑插件 · {metaTarget.key}</h3>
            <p className="text-xs text-gray-500 mb-4">自定义名称会同步显示在左侧菜单栏；不填写名称则使用默认名。</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">插件名称（留空恢复默认「{metaTarget.name}」）</label>
                <input
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  placeholder={metaTarget.name}
                  maxLength={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={metaShowSidebar} onChange={(e) => setMetaShowSidebar(e.target.checked)} className="w-4 h-4" />
                显示在左侧菜单栏
                <span className="text-xs text-gray-400">（取消勾选后，即使插件已启用，侧边栏也不显示其入口）</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setMetaTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={saveMeta} disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置弹窗 */}
      <PluginEventsPanel />
      {configTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfigTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{configTarget.name} · 配置</h3>
            <p className="text-xs text-gray-500 mb-4">{configTarget.description}</p>
            <div className="space-y-4">
              {(configTarget.configFields || []).map((f) => <div key={f.key}>{renderConfigField(f)}</div>)}
              {(configTarget.configFields || []).length === 0 && (
                <p className="text-sm text-gray-400">该插件无额外配置项（如需调整请通过其管理入口操作）。</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfigTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={saveConfig} disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
