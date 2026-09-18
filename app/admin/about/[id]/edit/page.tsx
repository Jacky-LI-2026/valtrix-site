"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Sparkles, X } from "lucide-react";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import MultiLangFieldAdapter from "@/components/admin/MultiLangFieldAdapter";
import UrlUploadInput from "@/components/admin/UrlUploadInput";
import { translateJsonArray } from "@/lib/translate-utils";
import { useAdminForm } from "@/lib/use-admin-form";
import { buildCapitalizeFields } from "@/lib/admin-form";
import { ABOUT_FIELDS } from "../../_fields";

interface Highlight {
  label: string; value: string; labelEn: string; valueEn: string;
  labelJa: string; valueJa: string; labelKo: string; valueKo: string;
  labelFr: string; valueFr: string; labelAr: string; valueAr: string;
}
interface Block { blockId: string; heading: string; paragraphs: string[] }

export default function AboutEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const {
    form,
    setForm,
    handleChange,
    handleValuesChange,
    getLangValues,
    buildFieldMap,
    getFormValues,
    updateFormValue,
  } = useAdminForm<Record<string, any>>(
    {
      image: "",
      content: [] as Block[],
      contentEn: [] as Block[],
      contentJa: [] as Block[],
      contentKo: [] as Block[],
      contentFr: [] as Block[],
      contentAr: [] as Block[],
      highlights: [] as Highlight[],
      sortOrder: 0,
      status: "published",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      geoRegion: "",
      geoCity: "",
    },
    ABOUT_FIELDS
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/about/${id}`);
      const data = await res.json();
      if (data.id) {
        // 将带lang的content数组拆分为中文和英文两个数组
        const rawContent = Array.isArray(data.content) ? data.content : [];
        const zhBlocks = rawContent
          .filter((b: any) => b.lang === 'zh' || !b.lang)
          .map(({ lang, ...rest }: any) => rest);
        const enBlocks = rawContent
          .filter((b: any) => b.lang === 'en')
          .map(({ lang, ...rest }: any) => rest);
        setForm((prev: any) => ({
          ...prev,
          title: data.title || "",
          titleEn: data.titleEn || "",
          titleJa: data.titleJa || "",
          titleKo: data.titleKo || "",
          titleFr: data.titleFr || "",
          titleAr: data.titleAr || "",
          subtitle: data.subtitle || "",
          subtitleEn: data.subtitleEn || "",
          subtitleJa: data.subtitleJa || "",
          subtitleKo: data.subtitleKo || "",
          subtitleFr: data.subtitleFr || "",
          subtitleAr: data.subtitleAr || "",
          image: data.image || "",
          content: zhBlocks,
          contentEn: enBlocks,
          contentJa: data.contentJa || [],
          contentKo: data.contentKo || [],
          contentFr: data.contentFr || [],
          contentAr: data.contentAr || [],
          highlights: data.highlights || [],
          sortOrder: data.sortOrder || 0,
          status: data.status || "published",
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
          seoKeywords: data.seoKeywords || "",
          geoRegion: data.geoRegion || "",
          geoCity: data.geoCity || "",
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setMessage("请填写标题");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      // 将中文和英文数组合并为带lang的数组（保持数据库兼容）
      const mergedContent = [
        ...(form.content as Block[]).map((b: any) => ({ ...b, lang: 'zh' })),
        ...(form.contentEn as Block[]).map((b: any) => ({ ...b, lang: 'en' })),
      ];
      const payload = {
        ...form,
        title: form.title || "",
        subtitle: form.subtitle || "",
        content: mergedContent,
        contentJa: form.contentJa || [],
        contentKo: form.contentKo || [],
        contentFr: form.contentFr || [],
        contentAr: form.contentAr || [],
        highlights: form.highlights || [],
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status || "published",
      };
      const res = await fetch(`/api/admin/about/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage("保存成功");
        setTimeout(() => router.push("/admin/about"), 1000);
      } else {
        const err = await res.json();
        setMessage(err.error || "保存失败");
      }
    } catch (error: any) {
      setMessage("保存失败: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== 内容块编辑辅助函数 =====
  const addContentBlock = (blocks: any[]) => {
    const blockId = `block-${Date.now()}`;
    return [...blocks, { blockId, heading: '', paragraphs: [''] }];
  };

  const deleteContentBlock = (blocks: any[], blockId: string) => {
    return blocks.filter((block: any) => block.blockId !== blockId);
  };

  const updateBlockHeading = (blocks: any[], blockId: string, heading: string) => {
    return blocks.map((block: any) =>
      block.blockId === blockId ? { ...block, heading } : block
    );
  };

  const addParagraph = (blocks: any[], blockId: string) => {
    return blocks.map((block: any) =>
      block.blockId === blockId ? { ...block, paragraphs: [...block.paragraphs, ''] } : block
    );
  };

  const deleteParagraph = (blocks: any[], blockId: string, paraIndex: number) => {
    return blocks.map((block: any) =>
      block.blockId === blockId
        ? { ...block, paragraphs: block.paragraphs.filter((_: string, i: number) => i !== paraIndex) }
        : block
    );
  };

  const updateParagraph = (blocks: any[], blockId: string, paraIndex: number, text: string) => {
    return blocks.map((block: any) =>
      block.blockId === blockId
        ? { ...block, paragraphs: block.paragraphs.map((p: string, i: number) => i === paraIndex ? text : p) }
        : block
    );
  };

  // 内容块编辑器组件（内联）
  const ContentBlockEditor = ({ value, onChange, lang, readOnly }: any) => {
    const [aiOpen, setAiOpen] = useState(false)
    const [aiHint, setAiHint] = useState('')
    const [aiBusy, setAiBusy] = useState(false)
    const [aiMsg, setAiMsg] = useState('')

    // AI 生成内容块：主题 → 结构化 blocks JSON 数组
    const handleAiGenerate = async () => {
      setAiBusy(true)
      setAiMsg('')
      try {
        const r = await fetch('/api/ai/feature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature: 'content_block_generate',
            action: 'generate_json',
            label: '内容块',
            prompt: `请为「${aiHint || '企业介绍'}」生成企业官网内容块 JSON 数组，数组元素结构为 {"heading":"小节标题","paragraphs":["段落1","段落2"]}，3-5 个内容块，每个块 1-3 段，专业 B2B 风格，只输出数组本身。`,
          }),
        })
        const d = await r.json()
        if (!d.ok) { setAiMsg(d.error || 'AI 调用失败'); return }
        let raw = (d.result || '').trim()
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
        const arr = JSON.parse(raw)
        if (!Array.isArray(arr)) throw new Error('返回格式不是数组')
        const newBlocks = arr
          .filter((x: any) => x && typeof x.heading === 'string' && x.heading.trim())
          .map((x: any) => ({
            blockId: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            heading: x.heading.trim(),
            paragraphs: Array.isArray(x.paragraphs) && x.paragraphs.length
              ? x.paragraphs.map((p: any) => String(p))
              : [''],
          }))
        if (!newBlocks.length) throw new Error('没有有效内容块')
        onChange([...blocks, ...newBlocks])
        setAiMsg(`已生成 ${newBlocks.length} 个内容块`)
      } catch (e: any) {
        setAiMsg('AI 生成失败：' + (e?.message || '返回内容无法解析'))
      } finally {
        setAiBusy(false)
      }
    }

    let blocks: any[] = [];
    if (Array.isArray(value)) {
      blocks = value;
    } else if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          blocks = parsed;
        }
      } catch (e) {
        console.error('解析内容块JSON失败:', e);
      }
    }
    const isZh = lang === 'zh';
    return (
      <div className="space-y-4">
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onChange(addContentBlock(blocks))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Plus size={14} /> {isZh ? '添加内容块' : 'Add Block'}
            </button>
            <button
              type="button"
              onClick={() => setAiOpen(!aiOpen)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
              title="AI 根据主题自动生成内容块"
            >
              <Sparkles size={14} /> AI 生成内容块
            </button>
          </div>
        )}
        {!readOnly && aiOpen && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
                <Sparkles size={12} /> AI 生成内容块
              </span>
              <button type="button" onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-gray-600" title="关闭">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              placeholder={isZh ? '输入主题，如：公司核心技术能力与研发体系' : 'Enter topic, e.g. Core technology and R&D system'}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiBusy}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 disabled:opacity-50"
              >
                {aiBusy ? '生成中…' : '生成并追加'}
              </button>
              {aiMsg && <span className="text-xs text-gray-500">{aiMsg}</span>}
            </div>
          </div>
        )}
        {blocks.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-8">
            {isZh ? '暂无内容块' : 'No blocks'}
          </p>
        )}
        {blocks.map((block: any, blockIndex: number) => (
          <div key={block.blockId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                {isZh ? `内容块 ${blockIndex + 1}` : `Block ${blockIndex + 1}`} (ID: {block.blockId})
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(deleteContentBlock(blocks, block.blockId))}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} /> {isZh ? '删除块' : 'Delete'}
                </button>
              )}
            </div>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">{isZh ? '标题' : 'Heading'}</label>
              <input
                type="text"
                value={block.heading}
                onChange={(e) => onChange(updateBlockHeading(blocks, block.blockId, e.target.value))}
                placeholder={isZh ? '输入内容块标题...' : 'Enter heading...'}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">{isZh ? '段落内容' : 'Paragraphs'}</label>
              {block.paragraphs.map((para: string, paraIndex: number) => (
                <div key={paraIndex} className="flex gap-2">
                  <textarea
                    rows={2}
                    value={para}
                    onChange={(e) => onChange(updateParagraph(blocks, block.blockId, paraIndex, e.target.value))}
                    placeholder={isZh ? '输入段落内容...' : 'Enter paragraph...'}
                    disabled={readOnly}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onChange(deleteParagraph(blocks, block.blockId, paraIndex))}
                      className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors self-start"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(addParagraph(blocks, block.blockId))}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + {isZh ? '添加段落' : 'Add Paragraph'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const updateHighlight = (i: number, patch: Partial<Highlight>) => {
    const n = [...(form.highlights as Highlight[])];
    n[i] = { ...n[i], ...patch };
    handleChange("highlights", n);
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/about" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">编辑关于我们板块</h1>
          <p className="text-gray-500 mt-1">修改板块信息，保存后前台同步更新</p>
        </div>
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

      {/* 自动翻译控制栏（content 为内容块数组，由下方 MultiLangFieldAdapter 字段内翻译处理，避免 JSON 翻译破坏数组结构） */}
      <AutoTranslateBar
        fieldMap={buildFieldMap()}
        capitalize={buildCapitalizeFields(ABOUT_FIELDS)}
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {ABOUT_FIELDS.map((f) => (
            <MultiLangFormField
              key={f.name}
              config={f}
              form={form}
              onValuesChange={handleValuesChange}
              getLangValues={getLangValues}
            />
          ))}
          {/* 板块图片 */}
          <div>
            <label className={labelCls}>板块图片</label>
            <UrlUploadInput
              value={form.image || ""}
              onChange={(url) => handleChange("image", url)}
              accept="image/*"
              showPreview={true}
              placeholder="/uploads/about-xxx.webp（未上传将显示默认占位图）"
            />
          </div>
          {/* 内容块 V2 多语言编辑器 */}
          <div className="col-span-2">
            <MultiLangFieldAdapter
              label="内容块"
              valueZh={JSON.stringify(form.content || [])}
              valueEn={JSON.stringify(form.contentEn || [])}
              onChangeZh={(v) => handleChange("content", JSON.parse(v))}
              onChangeEn={(v) => handleChange("contentEn", JSON.parse(v))}
              values={{
                zh: JSON.stringify(form.content || []),
                en: JSON.stringify(form.contentEn || []),
                ja: JSON.stringify(form.contentJa || []),
                ko: JSON.stringify(form.contentKo || []),
                fr: JSON.stringify(form.contentFr || []),
                ar: JSON.stringify(form.contentAr || []),
              }}
              onValuesChange={(values) => setForm((prev: any) => ({
                ...prev,
                content: values.zh !== undefined ? (values.zh ? JSON.parse(values.zh) : []) : prev.content,
                contentEn: values.en !== undefined ? (values.en ? JSON.parse(values.en) : []) : prev.contentEn,
                contentJa: values.ja !== undefined ? (values.ja ? JSON.parse(values.ja) : []) : prev.contentJa,
                contentKo: values.ko !== undefined ? (values.ko ? JSON.parse(values.ko) : []) : prev.contentKo,
                contentFr: values.fr !== undefined ? (values.fr ? JSON.parse(values.fr) : []) : prev.contentFr,
                contentAr: values.ar !== undefined ? (values.ar ? JSON.parse(values.ar) : []) : prev.contentAr,
              }))}
              onTranslate={(zh, targetLang) => translateJsonArray(zh, targetLang)}
              renderEditor={(value, onChange, lang, readOnly) => (
                <ContentBlockEditor
                  value={JSON.parse(value)}
                  onChange={(v: any) => onChange(JSON.stringify(v))}
                  lang={lang}
                  readOnly={readOnly}
                />
              )}
            />
          </div>

          {/* 核心价值观 / 统计项（企业资料板块=统计数据，企业文化板块=核心价值观） */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>核心价值观 / 统计项</label>
              <button
                type="button"
                onClick={() => handleChange("highlights", [...(form.highlights as Highlight[]), { label: "", value: "", labelEn: "", valueEn: "", labelJa: "", valueJa: "", labelKo: "", valueKo: "", labelFr: "", valueFr: "", labelAr: "", valueAr: "" }])}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} /> 添加项
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">“企业文化”板块显示为价值观（如：创新驱动）；“企业资料”板块显示为数据统计（如：成立时间 2018年）。</p>
            <div className="space-y-3">
              {(form.highlights as Highlight[]).length === 0 && (
                <p className="text-sm text-gray-400 italic">暂无数据，点击“添加项”开始添加</p>
              )}
              {(form.highlights as Highlight[]).map((h, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">中文标签</label>
                      <input type="text" value={h.label}
                        onChange={(e) => updateHighlight(i, { label: e.target.value })}
                        placeholder="如：创新驱动" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">中文内容</label>
                      <input type="text" value={h.value}
                        onChange={(e) => updateHighlight(i, { value: e.target.value })}
                        placeholder="如：以技术创新为核心" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">英文标签</label>
                      <input type="text" value={h.labelEn}
                        onChange={(e) => updateHighlight(i, { labelEn: e.target.value })}
                        placeholder="如：Innovation-Driven" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">英文内容</label>
                      <input type="text" value={h.valueEn}
                        onChange={(e) => updateHighlight(i, { valueEn: e.target.value })}
                        placeholder="如：Technology innovation at core" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">日文标签 / 内容</label>
                      <input type="text" value={h.labelJa} placeholder="日文标签"
                        onChange={(e) => updateHighlight(i, { labelJa: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                      <input type="text" value={h.valueJa} placeholder="日文内容"
                        onChange={(e) => updateHighlight(i, { valueJa: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">韩文标签 / 内容</label>
                      <input type="text" value={h.labelKo} placeholder="韩文标签"
                        onChange={(e) => updateHighlight(i, { labelKo: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                      <input type="text" value={h.valueKo} placeholder="韩文内容"
                        onChange={(e) => updateHighlight(i, { valueKo: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">法文标签 / 内容</label>
                      <input type="text" value={h.labelFr} placeholder="法文标签"
                        onChange={(e) => updateHighlight(i, { labelFr: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                      <input type="text" value={h.valueFr} placeholder="法文内容"
                        onChange={(e) => updateHighlight(i, { valueFr: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">阿文标签 / 内容</label>
                      <input type="text" value={h.labelAr} placeholder="阿文标签"
                        onChange={(e) => updateHighlight(i, { labelAr: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded mb-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                      <input type="text" value={h.valueAr} placeholder="阿文内容"
                        onChange={(e) => updateHighlight(i, { valueAr: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button"
                      onClick={() => handleChange("highlights", (form.highlights as Highlight[]).filter((_, idx) => idx !== i))}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors">
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SeoGeoConfig
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          seoKeywords={form.seoKeywords}
          geoRegion={form.geoRegion}
          geoCity={form.geoCity}
          onChange={(field, value) => handleChange(field, value)}
          sourceTitle={form.title}
          sourceText={form.subtitle}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/admin/about" className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">取消</Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
            <Save size={16} />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
