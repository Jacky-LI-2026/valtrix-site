"use client";

import { useState, useEffect } from "react";
import { Save, RefreshCw, Globe, CheckCircle, AlertCircle, Languages, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";

interface TranslateConfig {
  provider: string;
  // 百度翻译
  baiduAppId: string;
  baiduAppKey: string;
  baiduEnabled: boolean;
  // 阿里翻译
  aliyunAccessKeyId: string;
  aliyunAccessKeySecret: string;
  aliyunEnabled: boolean;
  // 小牛翻译
  niuApiKey: string;
  niuEnabled: boolean;
  // 腾讯翻译
  tencentSecretId: string;
  tencentSecretKey: string;
  tencentEnabled: boolean;
  // 有道翻译
  youdaoAppKey: string;
  youdaoAppSecret: string;
  youdaoEnabled: boolean;
  // MyMemory
  myMemoryEnabled: boolean;
  // AI 大模型翻译
  aiEnabled: boolean;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  // 通用设置
  defaultTargetLang: string;
  autoTranslate: boolean;
  // 翻译优先级
  priority: string[];
}

const defaultConfig: TranslateConfig = {
  provider: "baidu",
  baiduAppId: "",
  baiduAppKey: "",
  baiduEnabled: false,
  aliyunAccessKeyId: "",
  aliyunAccessKeySecret: "",
  aliyunEnabled: false,
  niuApiKey: "",
  niuEnabled: false,
  tencentSecretId: "",
  tencentSecretKey: "",
  tencentEnabled: false,
  youdaoAppKey: "",
  youdaoAppSecret: "",
  youdaoEnabled: false,
  myMemoryEnabled: true,
  aiEnabled: true,
  aiApiKey: "",
  aiBaseUrl: "https://api.deepseek.com/v1",
  aiModel: "deepseek-chat",
  defaultTargetLang: "en",
  autoTranslate: false,
  // 2026-09-14：移除 aliyun / tencent（后端仅为 TODO 占位实现，永远不可用）
  //             与 baidu（账户欠费 54004，排第二只会拖慢每次失败的回落）
  priority: ["ai", "niu", "youdao", "mymemory"],
};

const providerNames: Record<string, string> = {
  ai: "AI 翻译",
  baidu: "百度翻译",
  aliyun: "阿里翻译",
  niu: "小牛翻译",
  tencent: "腾讯翻译",
  youdao: "有道翻译",
  mymemory: "MyMemory",
};


/**
 * 提供方折叠区 / 开关（模块级）
 * ==========================================================================
 * 🔴 必须定义在模块级（owner 2026-09-21 报错「只能输入一个字符」的同一类程序缺陷）：
 *   组件内定义组件 ⇒ 每次渲染都是新类型 ⇒ React 卸载重建子树 ⇒ 子树上任何
 *   input 每敲一个字就丢一次焦点。展开状态与切换回调改为 props 传入。
 */
  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-red-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  const ProviderSection = ({
    id,
    title,
    color,
    description,
    applyUrl,
    expanded,
    onToggle,
    children,
  }: {
    id: string;
    title: string;
    color: string;
    description: string;
    applyUrl?: string;
    expanded: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-2">
          <Globe className={color} size={20} />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="text-gray-400" size={20} />
        ) : (
          <ChevronDown className="text-gray-400" size={20} />
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-500 mb-4">
            {description}
            {applyUrl && (
              <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                立即申请
              </a>
            )}
          </p>
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  );

export default function TranslateConfigPage() {
  const [config, setConfig] = useState<TranslateConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["baidu"]));

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/translate-config");
      const data = await res.json();
      if (data && data.provider) {
        const merged = { ...defaultConfig, ...data };
        if (merged.priority && Array.isArray(merged.priority) && !merged.priority.includes("ai")) {
          merged.priority = ["ai", ...merged.priority];
        }
        setConfig(merged);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/admin/translate-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ success: true, message: "配置保存成功" });
        fetchConfig();
      } else {
        setSaveResult({ success: false, message: "保存失败: " + (data.error || "未知错误") });
      }
    } catch (e: any) {
      setSaveResult({ success: false, message: "保存失败: " + e.message });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "VALTRIX是一家专业从事工业阀门与精密流体控制元件研发制造的高新技术企业。",
          targetLang: "en",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `翻译成功！使用${providerNames[data.provider] || data.provider}服务。翻译结果: ${data.translatedText}`,
        });
      } else {
        setTestResult({ success: false, message: data.error || "翻译失败" });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: "测试失败: " + e.message });
    } finally {
      setTesting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // 调整翻译优先级（MyMemory 固定在最后，不可移动）
  const movePriority = (index: number, direction: "up" | "down") => {
    setConfig((prev) => {
      const list = [...prev.priority];
      // 只允许移动非 mymemory 的项
      if (list[index] === "mymemory") return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      // 不允许把其他项移到 mymemory 后面（mymemory 固定最后）
      if (list[targetIndex] === "mymemory") return prev;
      [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
      return { ...prev, priority: list };
    });
  };

  if (loading) {
    return <div className="p-8 text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Languages className="text-red-600" />
          翻译配置
        </h1>
        <p className="text-gray-500 mt-1">配置多语言内容自动翻译服务，支持多个翻译接口，按优先级自动切换</p>
      </div>

      {/* AI 大模型翻译 */}
      <ProviderSection
        id="ai"
        expanded={expandedSections.has("ai")}
        onToggle={toggleSection}
        title="AI 大模型翻译"
        color="text-purple-600"
        description="调用大语言模型进行高质量翻译（支持豆包 Ark、DeepSeek、OpenAI 等 OpenAI 兼容接口）。翻译质量最佳，适合产品介绍、新闻等正式内容。未配置 Key 时自动跳过，不影响其他翻译通道。"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用 AI 翻译</label>
          <ToggleSwitch enabled={config.aiEnabled} onChange={() => setConfig({ ...config, aiEnabled: !config.aiEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={config.aiApiKey}
            onChange={(e) => setConfig({ ...config, aiApiKey: e.target.value })}
            placeholder="请输入 DeepSeek API Key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">接口地址（Base URL）</label>
          <input
            type="text"
            value={config.aiBaseUrl}
            onChange={(e) => setConfig({ ...config, aiBaseUrl: e.target.value })}
            placeholder="https://api.deepseek.com/v1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
          <input
            type="text"
            value={config.aiModel}
            onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
            placeholder="deepseek-chat"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>

      {/* 百度翻译 */}
      <ProviderSection
        id="baidu"
        expanded={expandedSections.has("baidu")}
        onToggle={toggleSection}
        title="百度翻译API"
        color="text-blue-600"
        description="百度翻译API提供高质量的机器翻译服务，标准版每月免费5万字符，企业认证后尊享版每月免费200万字符。"
        applyUrl="http://api.fanyi.baidu.com"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用百度翻译</label>
          <ToggleSwitch enabled={config.baiduEnabled} onChange={() => setConfig({ ...config, baiduEnabled: !config.baiduEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">APP ID</label>
          <input
            type="text"
            value={config.baiduAppId}
            onChange={(e) => setConfig({ ...config, baiduAppId: e.target.value })}
            placeholder="请输入百度翻译APP ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密钥</label>
          <input
            type="password"
            value={config.baiduAppKey}
            onChange={(e) => setConfig({ ...config, baiduAppKey: e.target.value })}
            placeholder="请输入百度翻译密钥"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>
      {/* 阿里翻译 */}
      <ProviderSection
        id="aliyun"
        expanded={expandedSections.has("aliyun")}
        onToggle={toggleSection}
        title="阿里翻译"
        color="text-yellow-600"
        description="阿里翻译是阿里云旗下的翻译服务，每月免费100万字符，支持多种语言互译。"
        applyUrl="https://www.aliyun.com/product/ai/base_alimt"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用阿里翻译</label>
          <ToggleSwitch enabled={config.aliyunEnabled} onChange={() => setConfig({ ...config, aliyunEnabled: !config.aliyunEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
          <input
            type="text"
            value={config.aliyunAccessKeyId}
            onChange={(e) => setConfig({ ...config, aliyunAccessKeyId: e.target.value })}
            placeholder="请输入阿里云Access Key ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Key Secret</label>
          <input
            type="password"
            value={config.aliyunAccessKeySecret}
            onChange={(e) => setConfig({ ...config, aliyunAccessKeySecret: e.target.value })}
            placeholder="请输入阿里云Access Key Secret"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>

      {/* 小牛翻译 */}
      <ProviderSection
        id="niu"
        expanded={expandedSections.has("niu")}
        onToggle={toggleSection}
        title="小牛翻译"
        color="text-green-600"
        description="小牛翻译每日免费20万字符（约每月600万字符），支持454种语言互译，免费额度最大。"
        applyUrl="https://niutrans.com"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用小牛翻译</label>
          <ToggleSwitch enabled={config.niuEnabled} onChange={() => setConfig({ ...config, niuEnabled: !config.niuEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={config.niuApiKey}
            onChange={(e) => setConfig({ ...config, niuApiKey: e.target.value })}
            placeholder="请输入小牛翻译API Key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>

      {/* 腾讯翻译 */}
      <ProviderSection
        id="tencent"
        expanded={expandedSections.has("tencent")}
        onToggle={toggleSection}
        title="腾讯翻译"
        color="text-cyan-600"
        description="腾讯翻译是腾讯云旗下的翻译服务，每月免费500万字符，支持多种语言互译。"
        applyUrl="https://cloud.tencent.com/product/tmt"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用腾讯翻译</label>
          <ToggleSwitch enabled={config.tencentEnabled} onChange={() => setConfig({ ...config, tencentEnabled: !config.tencentEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SecretId</label>
          <input
            type="text"
            value={config.tencentSecretId}
            onChange={(e) => setConfig({ ...config, tencentSecretId: e.target.value })}
            placeholder="请输入腾讯云SecretId"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SecretKey</label>
          <input
            type="password"
            value={config.tencentSecretKey}
            onChange={(e) => setConfig({ ...config, tencentSecretKey: e.target.value })}
            placeholder="请输入腾讯云SecretKey"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>

      {/* 有道翻译 */}
      <ProviderSection
        id="youdao"
        expanded={expandedSections.has("youdao")}
        onToggle={toggleSection}
        title="有道翻译"
        color="text-purple-600"
        description="有道翻译是网易有道旗下的翻译服务，新用户有一定的免费额度，翻译质量较好。"
        applyUrl="https://ai.youdao.com/product-fanyi-text.s"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用有道翻译</label>
          <ToggleSwitch enabled={config.youdaoEnabled} onChange={() => setConfig({ ...config, youdaoEnabled: !config.youdaoEnabled })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">应用ID</label>
          <input
            type="text"
            value={config.youdaoAppKey}
            onChange={(e) => setConfig({ ...config, youdaoAppKey: e.target.value })}
            placeholder="请输入有道翻译应用ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">应用密钥</label>
          <input
            type="password"
            value={config.youdaoAppSecret}
            onChange={(e) => setConfig({ ...config, youdaoAppSecret: e.target.value })}
            placeholder="请输入有道翻译应用密钥"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </ProviderSection>

      {/* MyMemory翻译 */}
      <ProviderSection
        id="mymemory"
        expanded={expandedSections.has("mymemory")}
        onToggle={toggleSection}
        title="MyMemory免费翻译"
        color="text-gray-600"
        description="MyMemory是免费的翻译服务，无需申请即可使用，作为其他翻译服务的备用方案。"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用MyMemory备用翻译</label>
          <ToggleSwitch enabled={config.myMemoryEnabled} onChange={() => setConfig({ ...config, myMemoryEnabled: !config.myMemoryEnabled })} />
        </div>
      </ProviderSection>

      {/* 通用设置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">通用设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认目标语言</label>
            <select
              value={config.defaultTargetLang}
              onChange={(e) => setConfig({ ...config, defaultTargetLang: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="en">英文 (English)</option>
              <option value="ja">日文 (日本語)</option>
              <option value="ko">韩文 (한국어)</option>
              <option value="fr">法文 (Français)</option>
              <option value="ar">阿拉伯文 (العربية)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">自动翻译</label>
              <p className="text-xs text-gray-500 mt-1">开启后，输入中文时自动翻译到其他语言（建议关闭，避免服务器负载过高）</p>
            </div>
            <ToggleSwitch enabled={config.autoTranslate} onChange={() => setConfig({ ...config, autoTranslate: !config.autoTranslate })} />
          </div>

          {/* 翻译优先级排序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">翻译服务优先级（从上到下依次尝试，MyMemory 固定最后）</label>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
              {config.priority.map((provider, index) => {
                const isMymemory = provider === "mymemory";
                const isFirst = index === 0;
                const isLastBeforeMymemory = index === config.priority.length - 2;
                return (
                  <div key={provider} className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className={`text-sm font-medium ${isMymemory ? "text-gray-400" : "text-gray-800"}`}>
                        {providerNames[provider] || provider}
                      </span>
                      {isMymemory && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">固定最后</span>
                      )}
                    </div>
                    {!isMymemory && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => movePriority(index, "up")}
                          disabled={isFirst}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="上移"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePriority(index, "down")}
                          disabled={isLastBeforeMymemory}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="下移"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">翻译时按此顺序依次尝试，前一个服务失败或额度用完后自动切换到下一个</p>
          </div>
        </div>
      </div>

      {/* 保存结果 */}
      {saveResult && (
        <div
          className={`rounded-lg p-4 mb-6 flex items-start gap-3 ${
            saveResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {saveResult.success ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <div>
            <p className={`text-sm font-medium ${saveResult.success ? "text-green-800" : "text-red-800"}`}>
              {saveResult.success ? "保存成功" : "保存失败"}
            </p>
            <p className={`text-sm mt-1 ${saveResult.success ? "text-green-700" : "text-red-700"}`}>
              {saveResult.message}
            </p>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`rounded-lg p-4 mb-6 flex items-start gap-3 ${
            testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <div>
            <p className={`text-sm font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
              {testResult.success ? "测试成功" : "测试失败"}
            </p>
            <p className={`text-sm mt-1 ${testResult.success ? "text-green-700" : "text-red-700"}`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? "保存中..." : "保存配置"}
        </button>
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <RefreshCw className="animate-spin" size={18} /> : <Globe size={18} />}
          {testing ? "测试中..." : "测试翻译"}
        </button>
      </div>

      {/* 说明 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">使用说明</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>支持多个翻译接口，按优先级自动切换，当前优先级：{config.priority.map((p) => providerNames[p] || p).join(" → ")}</li>
          <li>百度翻译API标准版每月免费5万字符，企业认证后尊享版每月免费200万字符</li>
          <li>阿里翻译每月免费100万字符，腾讯翻译每月免费500万字符</li>
          <li>小牛翻译每日免费20万字符（约每月600万字符），免费额度最大</li>
          <li>MyMemory免费翻译无需申请，作为备用方案自动启用</li>
          <li>建议关闭自动翻译，使用手动“一键翻译”按钮，避免服务器负载过高</li>
          <li>配置保存后，需要重启开发服务器才能生效</li>
        </ul>
      </div>
    </div>
  );
}
