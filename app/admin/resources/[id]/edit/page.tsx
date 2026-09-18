"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import UrlUploadInput from "@/components/admin/UrlUploadInput";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import { useAdminForm } from "@/lib/use-admin-form";
import { serializeJsonFields, deserializeJsonFields, buildCapitalizeFields } from "@/lib/admin-form";
import { RESOURCE_FIELDS } from "../../_fields";

export default function ResourceEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<any[]>([]);
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
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // 获取分类（/api/public/resources 返回的是分类列表，每个分类含 items 字段）
      const catRes = await fetch("/api/public/resources");
      const catData = await catRes.json();
      if (Array.isArray(catData)) {
        // 直接使用分类列表，移除 items 字段避免循环引用
        const cats = catData.map((cat: any) => {
          const { items, ...rest } = cat;
          return rest;
        });
        setCategories(cats);
      }

      // 获取资源详情
      const res = await fetch(`/api/admin/resources/${id}`);
      const data = await res.json();
      if (data.id) {
        const loaded = deserializeJsonFields(data, RESOURCE_FIELDS);
        setForm((prev) => ({
          ...prev,
          ...loaded,
          categoryId: data.categoryId?.toString() || "",
          sortOrder: data.sortOrder || 0,
          status: data.status || "published",
          format: data.format || "pdf",
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
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage("保存成功");
        setTimeout(() => router.push("/admin/resources"), 1000);
      } else {
        const err = await res.json();
        setMessage(err.error || "保存失败");
      }
    } catch (error) {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-400">加载中...</div>;
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/resources" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">编辑资源</h1>
          <p className="text-gray-500 mt-1">修改资源信息，保存后前台同步更新</p>
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

      <AutoTranslateBar
        fieldMap={buildFieldMap()}
        capitalize={buildCapitalizeFields(RESOURCE_FIELDS)}
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
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
            <label className={labelCls}>Slug</label>
            <input type="text" value={form.slug || ""} onChange={(e) => handleChange("slug", e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>分类</label>
            <select value={form.categoryId || ""} onChange={(e) => handleChange("categoryId", e.target.value)}
              className={inputCls}>
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.title || cat.name}</option>
              ))}
            </select>
          </div>
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
              placeholder="如：2.5MB" className={inputCls} />
          </div>
          <div className="col-span-2">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/admin/resources" className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            取消
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50">
            <Save size={16} />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
