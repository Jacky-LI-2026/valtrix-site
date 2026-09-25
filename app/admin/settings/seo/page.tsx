"use client";

import { useState, useEffect } from "react";
import { Save, Globe, MapPin, Phone, Mail, Send, RefreshCw, FileText, CheckCircle2, AlertCircle, Sparkles, Loader2 } from "lucide-react";

/**
 * 页面级 SEO 的语种（owner 2026-09-21：「页面级SEO标题应该增加多语言功能」）
 * 与数据库列对应：中文=defaultTitle/defaultDesc/keywords，其余=基础名 + En/Ja/Ko/Fr/Ar。
 */
const SEO_LANGS: { code: string; label: string; suffix: string }[] = [
  { code: "zh", label: "中文", suffix: "" },
  { code: "en", label: "English", suffix: "En" },
  { code: "ja", label: "日本語", suffix: "Ja" },
  { code: "ko", label: "한국어", suffix: "Ko" },
  { code: "fr", label: "Français", suffix: "Fr" },
  { code: "ar", label: "العربية", suffix: "Ar" },
];

interface SEOConfig {
  id: string;
  siteName: string;
  siteNameEn: string;
  defaultTitle: string;
  defaultDesc: string;
  keywords: string;
  /** 页面级 SEO 多语言（可空；空则回退中文，见 lib/seo.ts 的 seoTitleForLocale 等） */
  defaultTitleEn?: string; defaultTitleJa?: string; defaultTitleKo?: string; defaultTitleFr?: string; defaultTitleAr?: string;
  defaultDescEn?: string; defaultDescJa?: string; defaultDescKo?: string; defaultDescFr?: string; defaultDescAr?: string;
  keywordsEn?: string; keywordsJa?: string; keywordsKo?: string; keywordsFr?: string; keywordsAr?: string;
  companyName: string;
  companyAddress: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  geoRegion: string;
  baiduSiteUrl: string;
  baiduPushToken: string;
  indexnowKey: string;
}

export default function SEOConfigPage() {
  const [config, setConfig] = useState<SEOConfig>({
    id: "",
    siteName: "VALTRIX",
    siteNameEn: "VALTRIXNOLOGY",
    defaultTitle: "",
    defaultDesc: "",
    keywords: "",
    companyName: "",
    companyAddress: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    geoRegion: "CN-BJ",
    baiduSiteUrl: "",
    baiduPushToken: "",
    indexnowKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushState, setPushState] = useState<{ ok?: boolean; msg?: string }>({});
  const [pushing, setPushing] = useState(false);
  // 站点级 sitemap 状态检测
  const [sitemap, setSitemap] = useState<{ checking: boolean; ok?: boolean; count?: number; error?: string }>({ checking: true });
  // 页面级 SEO 多语言：当前编辑语种 + 一键翻译状态
  const [seoLang, setSeoLang] = useState("zh");
  const [seoI18nBusy, setSeoI18nBusy] = useState(false);
  const [seoI18nMsg, setSeoI18nMsg] = useState("");

  /**
   * 一键翻译：中文的 标题/描述/关键词 → 英/日/韩/法/阿
   * 走后台统一翻译接口 `/api/admin/translate`（与其它后台表单同一个入口），逐条回填。
   */
  const translateSeoAll = async () => {
    const src = {
      defaultTitle: String(config.defaultTitle || "").trim(),
      defaultDesc: String(config.defaultDesc || "").trim(),
      keywords: String(config.keywords || "").trim(),
    };
    if (!src.defaultTitle && !src.defaultDesc && !src.keywords) {
      setSeoI18nMsg("请先填写中文的标题/描述/关键词");
      return;
    }
    setSeoI18nBusy(true);
    setSeoI18nMsg("");
    const targets = SEO_LANGS.filter((l) => l.code !== "zh");
    const bases: { base: keyof typeof src; label: string; capitalize: boolean }[] = [
      { base: "defaultTitle", label: "标题", capitalize: true },
      { base: "defaultDesc", label: "描述", capitalize: false },
      { base: "keywords", label: "关键词", capitalize: false },
    ];
    const next: any = { ...config };
    try {
      for (const l of targets) {
        for (const b of bases) {
          const text = src[b.base];
          if (!text) continue;
          const res = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, targetLang: l.code, capitalize: b.capitalize }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok || !d.translatedText) throw new Error(`${l.label}${b.label}翻译失败：${d.error || res.status}`);
          next[`${b.base}${l.suffix}`] = d.translatedText;
          setConfig({ ...next }); // 逐条回填，能看进度
        }
      }
      setSeoI18nMsg(`已翻译 ${targets.length} 个语种`);
    } catch (e: any) {
      setSeoI18nMsg(e?.message || "翻译失败");
    } finally {
      setSeoI18nBusy(false);
    }
  };

  const checkSitemap = async () => {
    setSitemap((st) => ({ ...st, checking: true }));
    try {
      const res = await fetch("/sitemap.xml", { cache: "no-store" });
      if (!res.ok) {
        setSitemap({ checking: false, ok: false, error: `HTTP ${res.status}` });
        return;
      }
      const xml = await res.text();
      const count = (xml.match(/<url>/g) || []).length;
      setSitemap({ checking: false, ok: true, count });
    } catch (e: any) {
      setSitemap({ checking: false, ok: false, error: e?.message || "检测失败" });
    }
  };

  useEffect(() => {
    checkSitemap();
  }, []);


  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/seo-config");
      const data = await res.json();
      if (data && data.id) {
        setConfig({ ...data, indexnowKey: data.indexnowKey || "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.id) {
        alert("SEO配置保存成功");
      } else {
        alert("保存失败: " + (data.error || "未知错误"));
      }
    } catch (e: any) {
      alert("保存失败: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // 百度站长主动推送
  const pushToBaidu = async (all: boolean, urls?: string[]) => {
    setPushing(true);
    setPushState({});
    try {
      const res = await fetch("/api/admin/seo/baidu-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { urls: urls || [] }),
      });
      const data = await res.json();
      if (data.error) {
        setPushState({ ok: false, msg: data.error });
      } else {
        setPushState({ ok: true, msg: `已推送 ${data.count} 个 URL。百度：${data.baidu?.ok ? "成功" : "未配/失败"}( ${data.baidu?.body || data.baidu?.error || "-"} )；IndexNow：${data.indexnow?.ok ? "成功" : "未配/失败"}( ${data.indexnow?.body || data.indexnow?.error || "-"} )` });
      }
    } catch (e: any) {
      setPushState({ ok: false, msg: e.message });
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-dark-400">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-dark">SEO/GEO配置</h1>
        <p className="text-dark-500 text-sm mt-1">配置搜索引擎优化和地理位置优化参数</p>
      </div>

      {/* 站点级 Sitemap 状态检测 */}
      <div className="bg-white rounded-lg border border-dark-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          站点地图（sitemap.xml）状态
        </h2>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {sitemap.checking ? (
              <div className="flex items-center gap-2 text-sm text-dark-500">
                <RefreshCw size={14} className="animate-spin" /> 正在检测 /sitemap.xml ...
              </div>
            ) : sitemap.ok ? (
              <div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  <span className="font-medium">sitemap.xml 可正常访问</span>
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  <code className="bg-dark-50 px-1.5 py-0.5 rounded">/sitemap.xml</code>
                  {" "}当前收录 URL {sitemap.count ?? 0} 条，供 Google / Bing / 百度等搜索引擎爬取。
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle size={16} />
                  <span className="font-medium">sitemap.xml 访问异常</span>
                </div>
                <p className="text-xs text-dark-400 mt-1">{sitemap.error}。请确认已部署到可公网访问的环境。</p>
              </div>
            )}
          </div>
          <button
            onClick={checkSitemap}
            disabled={sitemap.checking}
            className="flex items-center gap-2 border border-dark-200 text-dark-600 px-4 py-2 rounded text-sm hover:bg-dark-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={sitemap.checking ? "animate-spin" : ""} />
            重新检测
          </button>
        </div>
      </div>

      {/* 基础SEO */}
      <div className="bg-white rounded-lg border border-dark-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          <Globe size={20} className="text-primary" />
          基础SEO配置
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-2">网站名称（中文）</label>
            <input
              type="text"
              value={config.siteName}
              onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">网站名称（英文）</label>
            <input
              type="text"
              value={config.siteNameEn}
              onChange={(e) => setConfig({ ...config, siteNameEn: e.target.value })}
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          {/* 页面级 SEO（标题/描述/关键词）——**多语言**：按语种 Tab 编辑，中文为基准，可一键翻译 */}
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-sm font-medium text-dark">页面级 SEO（标题 / 描述 / 关键词）</label>
              <span className="flex items-center gap-2">
                {seoI18nMsg && (
                  <span className={`text-xs ${seoI18nMsg.startsWith("已翻译") ? "text-green-600" : "text-red-500"}`}>{seoI18nMsg}</span>
                )}
                <button
                  type="button"
                  onClick={translateSeoAll}
                  disabled={seoI18nBusy}
                  title="把中文的标题/描述/关键词翻译到其余 5 个语种（可再手动修改）"
                  className="inline-flex items-center gap-1 text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  {seoI18nBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {seoI18nBusy ? "翻译中…" : "一键翻译"}
                </button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {SEO_LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSeoLang(l.code)}
                  className={`px-3 py-1.5 text-xs rounded-md border ${
                    seoLang === l.code ? "bg-primary text-white border-primary" : "border-dark-200 text-dark-500 hover:bg-dark-50"
                  }`}
                >
                  {l.label}
                  {l.code !== "zh" && !String((config as any)[`defaultTitle${l.suffix}`] || "").trim() ? " ⚠" : ""}
                </button>
              ))}
            </div>
            {(() => {
              const l = SEO_LANGS.find((x) => x.code === seoLang) || SEO_LANGS[0];
              const kTitle = `defaultTitle${l.suffix}`;
              const kDesc = `defaultDesc${l.suffix}`;
              const kKeys = `keywords${l.suffix}`;
              const ph = l.code === "zh"
                ? { title: "VALTRIX - 工业阀门与精密流体控制专家", desc: "VALTRIX Co., Ltd.专注于工业阀门与精密流体控制元件研发、制造与服务…", keys: "VALTRIX, 工业阀门, 闸阀, 球阀, 蝶阀, 流体控制…" }
                : { title: `${l.label} title`, desc: `${l.label} description`, keys: `${l.label} keywords` };
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-dark-500 mb-1">默认页面标题（{l.label}，上限 200 字符）</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={String((config as any)[kTitle] || "")}
                      onChange={(e) => setConfig({ ...config, [kTitle]: e.target.value } as any)}
                      placeholder={l.code === "zh" ? ph.title : `留空则回退中文标题`}
                      className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
                    />
                    <div className="mt-1 flex justify-end text-[11px] tabular-nums text-dark-400">
                      已用 {String((config as any)[kTitle] || "").length} / 上限 200
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-500 mb-1">默认页面描述（{l.label}）</label>
                    <textarea
                      rows={3}
                      value={String((config as any)[kDesc] || "")}
                      onChange={(e) => setConfig({ ...config, [kDesc]: e.target.value } as any)}
                      placeholder={l.code === "zh" ? ph.desc : "留空则回退中文描述"}
                      className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-500 mb-1">关键词（{l.label}，逗号分隔）</label>
                    <textarea
                      rows={2}
                      value={String((config as any)[kKeys] || "")}
                      onChange={(e) => setConfig({ ...config, [kKeys]: e.target.value } as any)}
                      placeholder={l.code === "zh" ? ph.keys : "留空则回退中文关键词"}
                      className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* GEO地理位置 */}
      <div className="bg-white rounded-lg border border-dark-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          GEO地理位置配置
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark mb-2">公司全称</label>
            <input
              type="text"
              value={config.companyName}
              onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
              placeholder="VALTRIX Co., Ltd."
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark mb-2">公司地址</label>
            <input
              type="text"
              value={config.companyAddress}
              onChange={(e) => setConfig({ ...config, companyAddress: e.target.value })}
              placeholder="北京市经开区科创十三街29号院一区2号楼8层"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2 flex items-center gap-1">
              <Phone size={14} /> 联系电话
            </label>
            <input
              type="text"
              value={config.phone}
              onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              placeholder="+86 138-0000-0000"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2 flex items-center gap-1">
              <Mail size={14} /> 邮箱
            </label>
            <input
              type="text"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="sales@valtrix.com"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">纬度</label>
            <input
              type="text"
              value={config.latitude}
              onChange={(e) => setConfig({ ...config, latitude: e.target.value })}
              placeholder="39.7900"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">经度</label>
            <input
              type="text"
              value={config.longitude}
              onChange={(e) => setConfig({ ...config, longitude: e.target.value })}
              placeholder="116.5000"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">地理区域（ISO 3166-2）</label>
            <input
              type="text"
              value={config.geoRegion}
              onChange={(e) => setConfig({ ...config, geoRegion: e.target.value })}
              placeholder="CN-BJ"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* 百度站长推送 */}
      <div className="bg-white rounded-lg border border-dark-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
          <Send size={20} className="text-primary" />
          百度站长主动推送
        </h2>
        <p className="text-sm text-dark-500 mb-4">
          配置站点地址后，一键向百度（站长平台）与必应/Yandex 等（IndexNow）双通道提交全站 URL，加速收录。
          百度：ziyuan.baidu.com 验证站点后填「普通收录-推送接口 token」；IndexNow：在 indexnow.org 生成 key 填入下方，并在站点根目录放置 {"{key}.txt"} 文件（内容为 key 本身）。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-2">百度站长站点地址</label>
            <input
              type="text"
              value={config.baiduSiteUrl}
              onChange={(e) => setConfig({ ...config, baiduSiteUrl: e.target.value })}
              placeholder="https://www.valvetrix.com"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-2">推送接口 token</label>
            <input
              type="text"
              value={config.baiduPushToken}
              onChange={(e) => setConfig({ ...config, baiduPushToken: e.target.value })}
              placeholder="百度搜索资源平台获取"
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark mb-2">IndexNow Key（必应/Bing 等）</label>
            <input
              type="text"
              value={config.indexnowKey}
              onChange={(e) => setConfig({ ...config, indexnowKey: e.target.value })}
              placeholder={"如 9a2b3c4d...（indexnow.org 生成；同时把 [key].txt 放站点根目录）"}
              className="w-full px-3 py-2 border border-dark-200 rounded focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => pushToBaidu(true)}
            disabled={pushing}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            {pushing ? "推送中..." : "推送全站 URL（百度 + IndexNow）"}
          </button>
          <span className="text-xs text-dark-400">新发布/更新的内容也会自动推送（已启用时）</span>
        </div>
        {pushState.msg && (
          <div className={`mt-3 text-sm p-3 rounded ${pushState.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {pushState.msg}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          保存配置
        </button>
      </div>

      {/* SEO说明 */}
      <div className="mt-6 p-4 bg-dark-50 rounded-lg">
        <h3 className="font-medium text-dark mb-2">SEO/GEO优化说明</h3>
        <ul className="text-sm text-dark-500 space-y-1">
          <li>• 动态meta标签：每个页面自动生成title、description、keywords</li>
          <li>• 结构化数据：产品、新闻、公司信息自动添加JSON-LD结构化数据</li>
          <li>• sitemap.xml：自动生成包含所有页面的站点地图</li>
          <li>• robots.txt：搜索引擎爬虫配置，禁止爬取后台和API</li>
          <li>• GEO优化：公司地址、经纬度、地理区域用于本地搜索优化</li>
          <li>• 页面性能：SSR服务端渲染，确保搜索引擎快速抓取内容</li>
        </ul>
      </div>
    </div>
  );
}
