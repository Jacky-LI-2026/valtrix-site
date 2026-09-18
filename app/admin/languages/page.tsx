"use client"

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Globe, Check, Star } from "lucide-react";

interface Language {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

// 常用语种预设
const PRESET_LANGUAGES = [
  { code: "zh", name: "中文", nameEn: "Chinese", flag: "🇨🇳" },
  { code: "en", name: "英文", nameEn: "English", flag: "🇺🇸" },
  { code: "ja", name: "日文", nameEn: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "韩文", nameEn: "Korean", flag: "🇰🇷" },
  { code: "de", name: "德文", nameEn: "German", flag: "🇩🇪" },
  { code: "fr", name: "法文", nameEn: "French", flag: "🇫🇷" },
  { code: "es", name: "西班牙文", nameEn: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "意大利文", nameEn: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "葡萄牙文", nameEn: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "俄文", nameEn: "Russian", flag: "🇷🇺" },
  { code: "ar", name: "阿拉伯文", nameEn: "Arabic", flag: "🇸🇦" },
  { code: "th", name: "泰文", nameEn: "Thai", flag: "🇹🇭" },
  { code: "vi", name: "越南文", nameEn: "Vietnamese", flag: "🇻🇳" },
  { code: "id", name: "印尼文", nameEn: "Indonesian", flag: "🇮🇩" },
  { code: "ms", name: "马来文", nameEn: "Malay", flag: "🇲🇾" },
  { code: "hi", name: "印地文", nameEn: "Hindi", flag: "🇮🇳" },
  { code: "nl", name: "荷兰文", nameEn: "Dutch", flag: "🇳🇱" },
  { code: "sv", name: "瑞典文", nameEn: "Swedish", flag: "🇸🇪" },
  { code: "pl", name: "波兰文", nameEn: "Polish", flag: "🇵🇱" },
  { code: "tr", name: "土耳其文", nameEn: "Turkish", flag: "🇹🇷" },
];

export default function LanguageAdminPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    nameEn: "",
    flag: "",
    isDefault: false,
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch("/api/admin/languages");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLanguages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      nameEn: "",
      flag: "",
      isDefault: false,
      isActive: true,
      sortOrder: languages.length + 1,
    });
    setShowForm(true);
  };

  const handleEdit = (lang: Language) => {
    setEditingId(lang.id);
    setForm({
      code: lang.code,
      name: lang.name,
      nameEn: lang.nameEn || "",
      flag: lang.flag || "",
      isDefault: lang.isDefault,
      isActive: lang.isActive,
      sortOrder: lang.sortOrder,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个语种吗？")) return;
    try {
      const res = await fetch(`/api/admin/languages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchLanguages();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  const handlePresetSelect = (code: string) => {
    const preset = PRESET_LANGUAGES.find((p) => p.code === code);
    if (preset) {
      setForm((prev) => ({
        ...prev,
        code: preset.code,
        name: preset.name,
        nameEn: preset.nameEn,
        flag: preset.flag,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      alert("请填写语种代码和名称");
      return;
    }
    try {
      const url = editingId ? `/api/admin/languages/${editingId}` : "/api/admin/languages";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.id || data.success) {
        setShowForm(false);
        fetchLanguages();
      } else {
        alert(data.error || "保存失败");
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const toggleActive = async (lang: Language) => {
    try {
      const res = await fetch(`/api/admin/languages/${lang.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lang, isActive: !lang.isActive }),
      });
      const data = await res.json();
      if (data.id || data.success) {
        fetchLanguages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">语种管理</h1>
          <p className="text-gray-500 mt-1">管理网站支持的语言，用于多语言内容和自动翻译</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新增语种
        </button>
      </div>

      {/* 语种表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "编辑语种" : "新增语种"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 快捷选择预设语种 */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">快捷选择常用语种</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_LANGUAGES.map((preset) => (
                      <button
                        key={preset.code}
                        type="button"
                        onClick={() => handlePresetSelect(preset.code)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          form.code === preset.code
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {preset.flag} {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">语种代码 *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="如：en, ja, ko"
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">语种名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="如：英文"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">英文名称</label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="如：English"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">国旗图标（Emoji）</label>
                <input
                  type="text"
                  value={form.flag}
                  onChange={(e) => setForm({ ...form, flag: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="如：🇺🇸"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <Star size={14} className="text-yellow-500" />
                    设为默认语种
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">启用此语种</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  <Save size={16} />
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 语种列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">国旗</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">语种代码</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">英文名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {languages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  暂无语种，点击右上角“新增语种”开始添加
                </td>
              </tr>
            ) : (
              languages.map((lang) => (
                <tr key={lang.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xl">{lang.flag || "🌐"}</td>
                  <td className="px-4 py-3">
                    <code className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">{lang.code}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                      {lang.isDefault && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded flex items-center gap-0.5">
                          <Star size={10} />
                          默认
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{lang.nameEn}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{lang.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(lang)}
                      className={`px-2 py-1 text-xs rounded ${
                        lang.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {lang.isActive ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(lang)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lang.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="删除"
                        disabled={lang.isDefault}
                      >
                        <Trash2 size={16} className={lang.isDefault ? "opacity-30" : ""} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>提示：</strong>语种管理用于控制网站支持的多语言。启用的语种会出现在前台语言切换器和后台自动翻译的目标语言列表中。默认语种为网站主要语言，不能删除。
        </p>
      </div>
    </div>
  );
}
