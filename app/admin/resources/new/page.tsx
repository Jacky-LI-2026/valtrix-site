"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import UrlUploadInput from "@/components/admin/UrlUploadInput";
import { useAdminForm } from "@/lib/use-admin-form";
import { serializeJsonFields, buildCapitalizeFields } from "@/lib/admin-form";
import { RESOURCE_FIELDS } from "../_fields";

export default function ResourceNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
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
      slug: "",
      categoryId: "",
      format: "pdf",
      size: "",
      fileUrl: "",
      sortOrder: 0,
      status: "published",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      geoRegion: "",
      geoCity: "",
    },
    RESOURCE_FIELDS
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/public/resources");
      const data = await res.json();
      if (Array.isArray(data)) {
        const cats = new Map();
        data.forEach((item: any) => {
          if (item.category && !cats.has(item.category.id)) {
            cats.set(item.category.id, item.category);
          }
        });
        setCategories(Array.from(cats.values()));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setMessage("请填写资源标题");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...serializeJsonFields(form, RESOURCE_FIELDS),
        slug: form.slug || "",
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        format: form.format || "pdf",
        size: form.size || "",
        fileUrl: form.fileUrl || "",
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status || "published",
        seoTitle: form.seoTitle || "",
        seoDescription: form.seoDescription || "",
        seoKeywords: form.seoKeywords || "",
        geoRegion: form.geoRegion || "",
        geoCity: form.geoCity || "",
      };
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id || data.success) {
        router.push("/admin/resources");
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
        <Link href="/admin/resources" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">新增资源</h1>
          <p className="text-gray-500 mt-1">创建新的下载资源，保存后前台即时更新</p>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md text-sm bg-red-50 border border-red-200 text-red-700">
          {message}
        </div>
      )}

      <AutoTranslateBar
        fieldMap={buildFieldMap()}
        capitalize={buildCapitalizeFields(RESOURCE_FIELDS)}
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {RESOURCE_FIELDS.map((f) => (
              <MultiLangFormField
                key={f.name}
                config={f}
                form={form}
                onValuesChange={handleValuesChange}
                getLangValues={getLangValues}
              />
            ))}
            <div>
              <label className={labelCls}>URL别名（slug）</label>
              <input type="text" value={form.slug || ""} onChange={(e) => handleChange("slug", e.target.value)}
                className={inputCls} placeholder="留空自动生成" />
            </div>
            <div>
              <label className={labelCls}>资源分类</label>
              <select value={form.categoryId || ""} onChange={(e) => handleChange("categoryId", e.target.value)}
                className={inputCls}>
                <option value="">选择分类</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.title || cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>文件格式</label>
              <select value={form.format || "pdf"} onChange={(e) => handleChange("format", e.target.value)}
                className={inputCls}>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="xls">Excel</option>
                <option value="zip">ZIP</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>文件大小</label>
              <input type="text" value={form.size || ""} onChange={(e) => handleChange("size", e.target.value)}
                className={inputCls} placeholder="如：2.5MB" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>下载文件（留空则显示灰色不可下载）</label>
              <UrlUploadInput
                value={form.fileUrl || ""}
                onChange={(url) => handleChange("fileUrl", url)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
                showPreview={true}
                placeholder="/files/xxx.pdf 或 https://..."
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
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEO/GEO配置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <SeoGeoConfig
            seoTitle={form.seoTitle}
            seoDescription={form.seoDescription}
            seoKeywords={form.seoKeywords}
            geoRegion={form.geoRegion}
            geoCity={form.geoCity}
            onChange={(field, value) => handleChange(field, value)}
            sourceTitle={form.title}
            sourceText={form.description}
            autoFill={false}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/resources" className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            取消
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50">
            <Save size={16} />
            {saving ? "创建中..." : "创建资源"}
          </button>
        </div>
      </form>
    </div>
  );
}
