"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import FileUpload from "@/components/admin/FileUpload";
import MultiLangTextField from "@/components/admin/MultiLangTextField";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";

// 多语言值对象（{zh,en,ja,ko,fr,ar}）
type LangValues = Record<string, string>;

interface Banner {
  id: string;
  image: string;
  title: LangValues;
  subtitle: LangValues;
  description: LangValues;
  ctaText: LangValues;
  badge: LangValues;
  secondaryCtaText: LangValues;
  link: string;
  sortOrder: number;
  bgColor?: string;
  bgOpacity?: number;
  gradientEnabled?: boolean;
  gradientDirection?: string;
  gradientColor2?: string;
}

interface Feature {
  id: string;
  icon: string;
  title: LangValues;
  description: LangValues;
}

interface Stat {
  id: string;
  number: string;
  label: LangValues;
}

const LANGS = ["zh", "en", "ja", "ko", "fr", "ar"];

// 轮播图背景配置（与页面头部配置 page-hero 同套：颜色/透明度/渐变/方向/第二色）
const BANNER_BG_DEFAULT = {
  bgColor: "#0a0a0a",
  bgOpacity: 0.5,
  gradientEnabled: false,
  gradientDirection: "to-bottom",
  gradientColor2: "#1a1a2e",
};
const GRADIENT_DIRECTIONS = [
  { value: "to-bottom", label: "从上到下" },
  { value: "to-top", label: "从下到上" },
  { value: "to-left", label: "从右到左" },
  { value: "to-right", label: "从左到右" },
  { value: "to-bottom-right", label: "左上到右下" },
  { value: "to-bottom-left", label: "右上到左下" },
];

// 兼容老数据：字符串 → {zh: 字符串}；对象保留
const normLang = (v: any): LangValues => {
  if (v && typeof v === "object") return { ...v };
  return v ? { zh: String(v) } : {};
};

// 后缀多语言字段名：ctaTitle + en → ctaTitleEn
const langKey = (base: string, lang: string) =>
  lang === "zh" ? base : `${base}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;

export default function HomeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [configId, setConfigId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("banner");

  const [banners, setBanners] = useState<Banner[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<{id: string, slug: string, name: string, model: string, tabSlug: string}[]>([]);
  const [allCategories, setAllCategories] = useState<{slug: string, name: string}[]>([]);
  const [showNews, setShowNews] = useState(true);
  const [showIndustries, setShowIndustries] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [ctaButtonLink, setCtaButtonLink] = useState("");

  // CTA + SEO 全部标量字段（含各语种后缀）
  const [extra, setExtra] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/home-config");
      const data = await res.json();
      if (data.id) {
        setConfigId(data.id.toString());
        setBanners((data.banners || []).map((b: any) => ({
          ...b,
          title: normLang(b.title),
          subtitle: normLang(b.subtitle),
        })));
        setFeatures((data.features || []).map((f: any) => ({
          ...f,
          title: normLang(f.title),
          description: normLang(f.description),
        })));
        setStats((data.stats || []).map((s: any) => ({
          ...s,
          label: normLang(s.label),
        })));
        setFeaturedProducts(data.featuredProducts || []);
        setFeaturedCategories(data.featuredCategories || []);
        setShowNews(data.showNews ?? true);
        setShowIndustries(data.showIndustries ?? true);
        setShowServices(data.showServices ?? true);
        setCtaButtonLink(data.ctaButtonLink || "");

        // 获取产品列表和类别列表（公开 API 返回 tabs → categories → models 嵌套结构）
        try {
          const prodRes = await fetch("/api/public/products?specs=3");
          const prodData = await prodRes.json();
          const tabs = prodData?.data || [];
          const prods: {id: string, slug: string, name: string, model: string, tabSlug: string}[] = [];
          const cats: {slug: string, name: string}[] = [];
          tabs.forEach((tab: any) => {
            cats.push({ slug: tab.id, name: tab.name });
            tab.categories?.forEach((cat: any) => {
              cat.models?.forEach((p: any) => {
                prods.push({ id: p.id, slug: p.id, name: p.name, model: p.model, tabSlug: tab.id });
              });
            });
          });
          setAllProducts(prods);
          setAllCategories(cats);
        } catch (e) {
          console.error("获取产品列表失败:", e);
        }
        // CTA/SEO 标量字段（含全语种）
        const ext: Record<string, string> = {};
        ["ctaTitle", "ctaSubtitle", "ctaButtonText", "seoTitle", "seoDesc", "seoKeywords"].forEach((base) => {
          LANGS.forEach((l) => {
            ext[langKey(base, l)] = data[langKey(base, l)] || "";
          });
        });
        setExtra(ext);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        id: configId,
        banners,
        features,
        stats,
        featuredProducts: featuredProducts,
        featuredCategories: featuredCategories,
        showNews,
        showIndustries,
        showServices,
        ctaButtonLink,
        ...extra,
      };
      const res = await fetch("/api/admin/home-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        const cut: { field: string; from: number; to: number }[] = saved?.__truncated || [];
        if (cut.length > 0) {
          setMessage(
            "保存成功，但以下字段超出长度上限已被自动截断：" +
              cut.map((c) => `${c.field}（${c.from}→${c.to} 字符）`).join("、")
          );
        } else {
          setMessage("保存成功，前台首页已更新");
        }
      } else {
        const err = await res.json();
        setMessage("保存失败: " + (err.error || "未知错误"));
      }
    } catch (error: any) {
      setMessage("保存失败: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 数组元素更新（按索引定位，避免 id 缺失/重复导致全组联动）
  const updateBanner = (index: number, field: keyof Banner, value: any) =>
    setBanners((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  const updateFeature = (index: number, field: keyof Feature, value: any) =>
    setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  const updateStat = (index: number, field: keyof Stat, value: any) =>
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const addBanner = () => {
    setBanners((prev) => [...prev, {
      id: Date.now().toString(),
      image: "",
      title: {},
      subtitle: {},
      description: {},
      ctaText: {},
      badge: {},
      secondaryCtaText: {},
      link: "",
      sortOrder: prev.length,
      ...BANNER_BG_DEFAULT,
    }]);
  };
  const addFeature = () => {
    setFeatures((prev) => [...prev, { id: Date.now().toString(), icon: "", title: {}, description: {} }]);
  };
  const addStat = () => {
    setStats((prev) => [...prev, { id: Date.now().toString(), number: "", label: {} }]);
  };

  const tabs = [
    { key: "banner", label: "Banner轮播" },
    { key: "feature", label: "核心优势" },
    { key: "stat", label: "数据统计" },
    { key: "product", label: "推荐产品" },
    { key: "section", label: "板块显示" },
    { key: "cta", label: "CTA区域" },
    { key: "seo", label: "SEO配置" },
  ];

  // CTA/SEO 多语言字段渲染辅助
  const renderExtraLang = (base: string, label: string, type: "text" | "textarea" = "text", rows = 3) => {
    const values: Record<string, string> = {};
    LANGS.forEach((l) => { values[l] = extra[langKey(base, l)] || ""; });
    return (
      <MultiLangTextField
        label={label}
        valueZh={extra[langKey(base, "zh")] || ""}
        valueEn={extra[langKey(base, "en")] || ""}
        onChangeZh={(v) => setExtra((prev) => ({ ...prev, [langKey(base, "zh")]: v }))}
        onChangeEn={(v) => setExtra((prev) => ({ ...prev, [langKey(base, "en")]: v }))}
        values={values}
        onValuesChange={(v) => setExtra((prev) => {
          const next = { ...prev };
          Object.entries(v).forEach(([l, val]) => { next[langKey(base, l)] = val || ""; });
          return next;
        })}
        type={type}
        rows={rows}
      />
    );
  };

  // 数组对象内嵌多语言字段渲染辅助
  const renderObjLang = (
    label: string,
    obj: LangValues,
    onChange: (v: LangValues) => void,
    type: "text" | "textarea" = "text",
    rows = 3
  ) => (
    <MultiLangTextField
      label={label}
      valueZh={obj?.zh || ""}
      valueEn={obj?.en || ""}
      onChangeZh={(v) => onChange({ ...(obj || {}), zh: v })}
      onChangeEn={(v) => onChange({ ...(obj || {}), en: v })}
      values={obj || {}}
      onValuesChange={(v) => onChange(v)}
      type={type}
      rows={rows}
    />
  );

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">首页配置</h1>
          <p className="text-gray-500 mt-1">配置首页Banner、优势、数据、推荐产品等内容</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? "保存中..." : "保存配置"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes("失败") || message.includes("错误")
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-green-50 border border-green-200 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* 一键翻译（CTA/SEO 标量字段） */}
      <AutoTranslateBar
        fieldMap={{
          ctaTitle: "ctaTitleEn",
          ctaSubtitle: "ctaSubtitleEn",
          ctaButtonText: "ctaButtonTextEn",
          seoTitle: "seoTitleEn",
          seoDesc: "seoDescEn",
          seoKeywords: "seoKeywordsEn",
        }}
        getFormValues={() => extra}
        updateFormValue={(field, value) => setExtra((prev) => ({ ...prev, [field]: value }))}
      />

      {/* 标签页 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Banner轮播 */}
          {activeTab === "banner" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">Banner轮播图（{banners.length}个）</h3>
                <button onClick={addBanner} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                  <Plus size={14} /> 添加Banner
                </button>
              </div>
              {banners.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">暂无Banner，点击上方按钮添加</p>
              ) : (
                <div className="space-y-4">
                  {banners.map((banner, index) => (
                    <div key={banner.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Banner #{index + 1}</span>
                        <button onClick={() => setBanners((prev) => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">图片 <span className="text-gray-400 font-normal">（推荐 1920×720（约 16:6）或 1920×1080；支持 JPG/PNG/WebP，上传后自动压缩为 WebP）</span></label>
                          <FileUpload
                            value={banner.image}
                            onChange={(url) => updateBanner(index, "image", url)}
                            type="image"
                            label=""
                          />
                        </div>
                        {renderObjLang("标题", banner.title, (v) => updateBanner(index, "title", v))}
                        <div className="border-t border-gray-200 pt-4">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                            背景/遮罩配置
                            <span className="text-gray-400 font-normal">（与页面头部配置一致：颜色、透明度、渐变、方向、第二色）</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">背景/遮罩颜色</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={banner.bgColor || BANNER_BG_DEFAULT.bgColor}
                                  onChange={(e) => updateBanner(index, "bgColor", e.target.value)}
                                  className="w-9 h-9 rounded cursor-pointer border shrink-0"
                                />
                                <input
                                  type="text"
                                  value={banner.bgColor || BANNER_BG_DEFAULT.bgColor}
                                  onChange={(e) => updateBanner(index, "bgColor", e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">透明度: {Math.round((typeof banner.bgOpacity === "number" ? banner.bgOpacity : BANNER_BG_DEFAULT.bgOpacity) * 100)}%</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={typeof banner.bgOpacity === "number" ? banner.bgOpacity : BANNER_BG_DEFAULT.bgOpacity}
                                onChange={(e) => updateBanner(index, "bgOpacity", parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-500">启用渐变</label>
                              <button
                                onClick={() => updateBanner(index, "gradientEnabled", !(banner.gradientEnabled || BANNER_BG_DEFAULT.gradientEnabled))}
                                className={`w-9 h-5 rounded-full transition-colors ${(banner.gradientEnabled || BANNER_BG_DEFAULT.gradientEnabled) ? "bg-blue-600" : "bg-gray-300"}`}
                              >
                                <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${(banner.gradientEnabled || BANNER_BG_DEFAULT.gradientEnabled) ? "translate-x-4.5" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                            {(banner.gradientEnabled || BANNER_BG_DEFAULT.gradientEnabled) && (
                              <>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">渐变方向</label>
                                  <select
                                    value={banner.gradientDirection || BANNER_BG_DEFAULT.gradientDirection}
                                    onChange={(e) => updateBanner(index, "gradientDirection", e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                  >
                                    {GRADIENT_DIRECTIONS.map((d) => (
                                      <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">渐变结束颜色</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={banner.gradientColor2 || BANNER_BG_DEFAULT.gradientColor2}
                                      onChange={(e) => updateBanner(index, "gradientColor2", e.target.value)}
                                      className="w-9 h-9 rounded cursor-pointer border shrink-0"
                                    />
                                    <input
                                      type="text"
                                      value={banner.gradientColor2 || BANNER_BG_DEFAULT.gradientColor2}
                                      onChange={(e) => updateBanner(index, "gradientColor2", e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">链接</label>
                          <input type="text" value={banner.link} onChange={(e) => updateBanner(index, "link", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm" placeholder="/products" />
                        </div>
                        {renderObjLang("副标题", banner.subtitle, (v) => updateBanner(index, "subtitle", v))}
                        {renderObjLang("描述", banner.description, (v) => updateBanner(index, "description", v), "textarea", 3)}
                        {renderObjLang("按钮文字", banner.ctaText, (v) => updateBanner(index, "ctaText", v))}
                        {renderObjLang("徽章文字（留空用默认）", banner.badge, (v) => updateBanner(index, "badge", v))}
                        {renderObjLang("右侧按钮文字（留空用默认）", banner.secondaryCtaText, (v) => updateBanner(index, "secondaryCtaText", v))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 核心优势 */}
          {activeTab === "feature" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">核心优势（{features.length}个）</h3>
                <button onClick={addFeature} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                  <Plus size={14} /> 添加优势
                </button>
              </div>
              {features.map((feature, index) => (
                <div key={feature.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">优势 #{index + 1}</span>
                    <button onClick={() => setFeatures((prev) => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">图标（lucide图标名）</label>
                      <input type="text" value={feature.icon} onChange={(e) => updateFeature(index, "icon", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" placeholder="如：award" />
                    </div>
                    {renderObjLang("标题", feature.title, (v) => updateFeature(index, "title", v))}
                    {renderObjLang("描述", feature.description, (v) => updateFeature(index, "description", v), "textarea", 2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 数据统计 */}
          {activeTab === "stat" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">数据统计（{stats.length}个）</h3>
                <button onClick={addStat} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                  <Plus size={14} /> 添加数据
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div key={stat.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">数据 #{index + 1}</span>
                      <button onClick={() => setStats((prev) => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">数字</label>
                        <input type="text" value={stat.number} onChange={(e) => updateStat(index, "number", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm" placeholder="如：24+" />
                      </div>
                      {renderObjLang("标签", stat.label, (v) => updateStat(index, "label", v))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推荐产品 */}
          {activeTab === "product" && (
            <div className="space-y-6">
              {/* 推荐产品类别 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">推荐产品类别（首页按此顺序显示）</h3>
                {featuredCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center border border-dashed rounded mb-3">暂未选择类别</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {featuredCategories.map((slug, index) => {
                      const cat = allCategories.find((c) => c.slug === slug);
                      return (
                        <div key={slug} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
                          <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                          <span className="flex-1 text-sm">
                            {cat?.name || slug}
                            <span className="text-gray-400 text-xs ml-2">({slug})</span>
                          </span>
                          <button
                            onClick={() => {
                              if (index > 0) {
                                const next = [...featuredCategories];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                setFeaturedCategories(next);
                              }
                            }}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                          >↑</button>
                          <button
                            onClick={() => {
                              if (index < featuredCategories.length - 1) {
                                const next = [...featuredCategories];
                                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                setFeaturedCategories(next);
                              }
                            }}
                            disabled={index === featuredCategories.length - 1}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                          >↓</button>
                          <button
                            onClick={() => setFeaturedCategories(featuredCategories.filter((s) => s !== slug))}
                            className="text-red-500 hover:text-red-700 px-1"
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-2">点击添加类别：</p>
                <div className="max-h-40 overflow-y-auto border rounded">
                  {allCategories.filter((c) => !featuredCategories.includes(c.slug)).map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setFeaturedCategories([...featuredCategories, cat.slug])}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2"
                    >
                      <span className="text-blue-500">+</span>
                      <span>{cat.name}</span>
                      <span className="text-gray-400 text-xs">({cat.slug})</span>
                    </button>
                  ))}
                  {allCategories.filter((c) => !featuredCategories.includes(c.slug)).length === 0 && (
                    <p className="text-sm text-gray-400 py-3 text-center">所有类别已添加</p>
                  )}
                </div>
              </div>

              <hr />

              <h3 className="text-sm font-medium text-gray-900">推荐产品（首页按此顺序显示）</h3>

              {/* 已选产品 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">已选产品（{featuredProducts.length}个）：</p>
                {featuredProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center border border-dashed rounded">暂未选择，将显示全部产品</p>
                ) : (
                  <div className="space-y-2">
                    {featuredProducts.map((slug, index) => {
                      const prod = allProducts.find((p) => p.slug === slug);
                      return (
                        <div key={slug} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
                          <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                          <span className="flex-1 text-sm">
                            {prod?.name || slug}
                            <span className="text-gray-400 text-xs ml-2">({slug})</span>
                          </span>
                          <button
                            onClick={() => {
                              if (index > 0) {
                                const next = [...featuredProducts];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                setFeaturedProducts(next);
                              }
                            }}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                            title="上移"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => {
                              if (index < featuredProducts.length - 1) {
                                const next = [...featuredProducts];
                                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                setFeaturedProducts(next);
                              }
                            }}
                            disabled={index === featuredProducts.length - 1}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                            title="下移"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => setFeaturedProducts(featuredProducts.filter((s) => s !== slug))}
                            className="text-red-500 hover:text-red-700 px-1"
                            title="移除"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 可选产品 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">点击添加产品：</p>
                <div className="max-h-60 overflow-y-auto border rounded">
                  {allProducts.filter((p) => !featuredProducts.includes(p.slug)).map((prod) => (
                    <button
                      key={prod.slug}
                      onClick={() => setFeaturedProducts([...featuredProducts, prod.slug])}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2"
                    >
                      <span className="text-blue-500">+</span>
                      <span>{prod.name}</span>
                      <span className="text-gray-400 text-xs">({prod.slug})</span>
                    </button>
                  ))}
                  {allProducts.filter((p) => !featuredProducts.includes(p.slug)).length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">所有产品已添加</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 板块显示 */}
          {activeTab === "section" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">首页板块显示控制</h3>
              <div className="space-y-3">
                {[
                  { key: "showNews", label: "显示新闻资讯板块", value: showNews, setter: setShowNews },
                  { key: "showIndustries", label: "显示行业应用板块", value: showIndustries, setter: setShowIndustries },
                  { key: "showServices", label: "显示服务内容板块", value: showServices, setter: setShowServices },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.value}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* CTA区域 */}
          {activeTab === "cta" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">CTA行动召唤区域</h3>
              <div className="grid grid-cols-1 gap-4">
                {renderExtraLang("ctaTitle", "CTA标题（上限 200 字符）")}
                {renderExtraLang("ctaSubtitle", "CTA副标题（上限 500 字符）")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderExtraLang("ctaButtonText", "按钮文字（上限 50 字符）")}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">按钮链接</label>
                    <input type="text" value={ctaButtonLink} onChange={(e) => setCtaButtonLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm" placeholder="/contact" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO配置 */}
          {activeTab === "seo" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">首页SEO配置</h3>
              <div className="space-y-4">
                {renderExtraLang("seoTitle", "SEO标题（上限 200 字符）")}
                {renderExtraLang("seoDesc", "SEO描述", "textarea", 3)}
                {renderExtraLang("seoKeywords", "SEO关键词（逗号分隔）")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
