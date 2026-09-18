"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Tag, MapPin, TrendingUp, Copy, Check } from "lucide-react";

interface SEOKeywordExtractorProps {
  title: string;
  content: string;
  onApplyKeywords?: (keywords: string[]) => void;
  defaultKeywords?: string[];
}

interface KeywordResult {
  core: string[];
  related: string[];
  longTail: string[];
  geo: string[];
  suggestions: string[];
}

export default function SEOKeywordExtractor({
  title,
  content,
  onApplyKeywords,
  defaultKeywords = [],
}: SEOKeywordExtractorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(defaultKeywords);
  const [copied, setCopied] = useState(false);

  const extractKeywords = async () => {
    if (!title && !content) {
      alert("请先输入标题或内容");
      return;
    }
    setLoading(true);
    try {
      const prompt = `请作为专业的SEO优化专家，根据以下文章标题和内容，提取并生成SEO关键词。

文章标题：${title}
文章内容摘要：${content.slice(0, 500)}

请生成以下五类关键词（每类5-8个）：
1. 核心关键词：文章最核心的主题词
2. 相关关键词：与核心主题相关的词汇
3. 长尾关键词：搜索量较低但转化率高的长尾词
4. GEO地理位置关键词：结合地域的关键词（如北京、深圳、中国等）
5. 搜索趋势建议：当前热门的相关搜索词

请以JSON格式返回：
{"core":["关键词1","关键词2"],"related":["关键词1"],"longTail":["关键词1"],"geo":["关键词1"],"suggestions":["关键词1"]}`;

      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "custom", content: prompt }),
      });
      const data = await res.json();

      if (data.success && data.result) {
        let keywords: KeywordResult = { core: [], related: [], longTail: [], geo: [], suggestions: [] };
        try {
          const jsonMatch = data.result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            keywords = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // 解析失败时使用默认空数组
        }
        setResult(keywords);
      } else {
        alert("关键词提取失败: " + (data.error || "请检查大模型配置"));
      }
    } catch (error: any) {
      alert("关键词提取失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  };

  const applyKeywords = () => {
    if (onApplyKeywords && selectedKeywords.length > 0) {
      onApplyKeywords(selectedKeywords);
      alert(`已应用 ${selectedKeywords.length} 个关键词`);
    }
  };

  const copyKeywords = () => {
    const text = selectedKeywords.join(", ");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderKeywordGroup = (
    label: string,
    icon: React.ReactNode,
    keywords: string[],
    color: string
  ) => {
    if (!keywords || keywords.length === 0) return null;
    return (
      <div className="mb-4">
        <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${color}`}>
          {icon}
          {label}
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <button
              key={index}
              onClick={() => toggleKeyword(keyword)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                selectedKeywords.includes(keyword)
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-dark-600 border-dark-200 hover:border-primary hover:text-primary"
              }`}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          <span className="text-sm font-bold text-purple-800">SEO/GEO 关键词智能提取</span>
        </div>
        <button
          onClick={extractKeywords}
          disabled={loading || (!title && !content)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "提取中..." : "提取关键词"}
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          {renderKeywordGroup("核心关键词", <Tag size={14} />, result.core, "text-red-600")}
          {renderKeywordGroup("相关关键词", <TrendingUp size={14} />, result.related, "text-blue-600")}
          {renderKeywordGroup("长尾关键词", <Tag size={14} />, result.longTail, "text-green-600")}
          {renderKeywordGroup("GEO地域关键词", <MapPin size={14} />, result.geo, "text-orange-600")}
          {renderKeywordGroup("搜索趋势建议", <TrendingUp size={14} />, result.suggestions, "text-purple-600")}

          {/* 已选关键词 */}
          {selectedKeywords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-700">
                  已选关键词 ({selectedKeywords.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyKeywords}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "已复制" : "复制"}
                  </button>
                  {onApplyKeywords && (
                    <button
                      onClick={applyKeywords}
                      className="px-2.5 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      应用到页面
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <p className="text-xs text-purple-500">
          输入标题和内容后点击“提取关键词”，AI将自动提取核心关键词、相关关键词、长尾关键词、GEO地域关键词和搜索趋势建议。点击关键词可选择应用到页面。
        </p>
      )}
    </div>
  );
}
