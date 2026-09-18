"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import { useAdminForm } from "@/lib/use-admin-form";
import { serializeJsonFields, buildCapitalizeFields } from "@/lib/admin-form";
import { CAREER_FIELDS } from "../_fields";

export default function CareerNewPage() {
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
  } = useAdminForm<Record<string, any>>({}, CAREER_FIELDS);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setMessage("请填写职位名称");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...serializeJsonFields(form, CAREER_FIELDS),
        slug: form.slug || "",
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status || "open",
        seoTitle: form.seoTitle || "",
        seoDescription: form.seoDescription || "",
        seoKeywords: form.seoKeywords || "",
        geoRegion: form.geoRegion || "",
        geoCity: form.geoCity || "",
      };
      const res = await fetch("/api/admin/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id || data.success) {
        router.push("/admin/careers");
      } else {
        setMessage("创建失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      setMessage("创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/careers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">新增招聘职位</h1>
          <p className="text-gray-500 mt-1">填写职位信息，保存后前台即时更新</p>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md text-sm bg-red-50 border border-red-200 text-red-700">
          {message}
        </div>
      )}

      <AutoTranslateBar
        fieldMap={buildFieldMap()}
        capitalize={buildCapitalizeFields(CAREER_FIELDS)}
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {CAREER_FIELDS.map((f) => (
            <MultiLangFormField
              key={f.name}
              config={f}
              form={form}
              onValuesChange={handleValuesChange}
              getLangValues={getLangValues}
            />
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL别名</label>
            <input type="text" value={form.slug || ""} onChange={(e) => handleChange("slug", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="留空自动生成" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <input type="number" value={form.sortOrder || 0} onChange={(e) => handleChange("sortOrder", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select value={form.status || "open"} onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none">
              <option value="open">招聘中</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
        </div>

        <SeoGeoConfig
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          seoKeywords={form.seoKeywords}
          geoRegion={form.geoRegion}
          geoCity={form.geoCity}
          onChange={handleChange}
          sourceTitle={form.title}
          sourceText={form.description}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/admin/careers" className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            取消
          </Link>
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
