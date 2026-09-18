"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import MultiLangFieldAdapter from "@/components/admin/MultiLangFieldAdapter";
import UrlUploadInput from "@/components/admin/UrlUploadInput";
import JsonArrayEditor from "@/components/admin/JsonArrayEditor";
import { translateJsonArray } from "@/lib/translate-utils";
import { useAdminForm } from "@/lib/use-admin-form";
import { buildCapitalizeFields } from "@/lib/admin-form";
import { ABOUT_FIELDS } from "../_fields";

interface Highlight {
  label: string; value: string; labelEn: string; valueEn: string;
  labelJa: string; valueJa: string; labelKo: string; valueKo: string;
  labelFr: string; valueFr: string; labelAr: string; valueAr: string;
}

export default function AboutNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const {
    form,
    handleChange,
    handleValuesChange,
    getLangValues,
    buildFieldMap,
    getFormValues,
    updateFormValue,
  } = useAdminForm<Record<string, any>>(
    {
      image: "",
      content: "[]",
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

  const updateHighlight = (i: number, patch: Partial<Highlight>) => {
    const n = [...(form.highlights as Highlight[])];
    n[i] = { ...n[i], ...patch };
    handleChange("highlights", n);
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
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status || "published",
      };
      const res = await fetch("/api/admin/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id || data.success) {
        router.push("/admin/about");
      } else {
        setMessage("创建失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      setMessage("创建失败");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/about" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">新增关于我们</h1>
          <p className="text-gray-500 mt-1">填写关于我们内容，保存后前台即时更新</p>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md text-sm bg-red-50 border border-red-200 text-red-700">{message}</div>
      )}

      <AutoTranslateBar
        fieldMap={buildFieldMap()}
        capitalize={buildCapitalizeFields(ABOUT_FIELDS)}
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
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

          <div>
            <label className={labelCls}>排序</label>
            <input type="number" value={form.sortOrder ?? 0} onChange={(e) => handleChange("sortOrder", e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>状态</label>
            <select value={form.status || "published"} onChange={(e) => handleChange("status", e.target.value)}
              className={inputCls}>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>

          <MultiLangFieldAdapter
            label="内容块"
            valueZh={form.content || "[]"}
            valueEn={form.contentEn || "[]"}
            onChangeZh={(v) => handleChange("content", v)}
            onChangeEn={(v) => handleChange("contentEn", v)}
            values={getLangValues('content')}
            onValuesChange={(values) => handleValuesChange('content', values)}
            onTranslate={(zh, targetLang) => translateJsonArray(zh, targetLang)}
            renderEditor={(value, onChange, lang, readOnly) => (
              <JsonArrayEditor
                value={value}
                onChange={onChange}
                fields={[]}
                title={lang === 'zh' ? '内容块配置' : 'Content Blocks'}
              />
            )}
          />
          {/* 核心价值观 / 统计项 */}
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
            {saving ? "创建中..." : "创建"}
          </button>
        </div>
      </form>
    </div>
  );
}
