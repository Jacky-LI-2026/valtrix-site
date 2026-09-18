"use client"

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Save, X, Menu as MenuIcon } from "lucide-react";
import MultiLangTextField from "@/components/admin/MultiLangTextField";
import AiTextButton from "@/components/admin/AiTextButton";

interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionJa?: string;
  descriptionKo?: string;
  descriptionFr?: string;
  descriptionAr?: string;
  url: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  icon: string;
  children?: MenuItem[];
}

export default function MenuAdminPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: "",
    nameEn: "",
    nameJa: "",
    nameKo: "",
    nameFr: "",
    nameAr: "",
    description: "",
    descriptionEn: "",
    descriptionJa: "",
    descriptionKo: "",
    descriptionFr: "",
    descriptionAr: "",
    url: "",
    parentId: "",
    sortOrder: 0,
    isActive: true,
    icon: "",
  });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/admin/menus");
      const data = await res.json();
      if (Array.isArray(data)) {
        // 构建树形结构
        const tree = buildTree(data);
        setMenus(tree);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (items: MenuItem[]): MenuItem[] => {
    const map = new Map<string, MenuItem>();
    const roots: MenuItem[] = [];
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = (parentId: string | null = null) => {
    setEditingId(null);
    setForm({
      name: "",
      nameEn: "",
      nameJa: "",
      nameKo: "",
      nameFr: "",
      nameAr: "",
      description: "",
      descriptionEn: "",
      descriptionJa: "",
      descriptionKo: "",
      descriptionFr: "",
      descriptionAr: "",
      url: "",
      parentId: parentId || "",
      sortOrder: 0,
      isActive: true,
      icon: "",
    });
    setShowForm(true);
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingId(menu.id);
    setForm({
      name: menu.name,
      nameEn: menu.nameEn || "",
      nameJa: menu.nameJa || "",
      nameKo: menu.nameKo || "",
      nameFr: menu.nameFr || "",
      nameAr: menu.nameAr || "",
      description: menu.description || "",
      descriptionEn: menu.descriptionEn || "",
      descriptionJa: menu.descriptionJa || "",
      descriptionKo: menu.descriptionKo || "",
      descriptionFr: menu.descriptionFr || "",
      descriptionAr: menu.descriptionAr || "",
      url: menu.url,
      parentId: menu.parentId || "",
      sortOrder: menu.sortOrder,
      isActive: menu.isActive,
      icon: menu.icon || "",
    });
    setShowForm(true);
  };

  // 多语言字段值变化处理
  const handleNameValuesChange = (values: Record<string, string>) => {
    setForm((prev) => ({
      ...prev,
      name: values.zh || "",
      nameEn: values.en || "",
      nameJa: values.ja || "",
      nameKo: values.ko || "",
      nameFr: values.fr || "",
      nameAr: values.ar || "",
    }));
  };

  // 菜单描述多语言
  const handleDescValuesChange = (values: Record<string, string>) => {
    setForm((prev) => ({
      ...prev,
      description: values.zh || "",
      descriptionEn: values.en || "",
      descriptionJa: values.ja || "",
      descriptionKo: values.ko || "",
      descriptionFr: values.fr || "",
      descriptionAr: values.ar || "",
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个菜单吗？")) return;
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchMenus();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (e) {
      alert("删除失败");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert("请填写菜单名称");
      return;
    }
    try {
      const payload = {
        ...form,
        parentId: form.parentId || null,
      };
      const url = editingId ? `/api/admin/menus/${editingId}` : "/api/admin/menus";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.id || data.success) {
        setShowForm(false);
        fetchMenus();
      } else {
        alert(data.error || "保存失败");
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const flattenMenus = (items: MenuItem[]): MenuItem[] => {
    let result: MenuItem[] = [];
    items.forEach((item) => {
      result.push(item);
      if (item.children) {
        result = result.concat(flattenMenus(item.children));
      }
    });
    return result;
  };

  const renderMenuTree = (items: MenuItem[], level: number = 0) => {
    return items.map((menu) => (
      <div key={menu.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
            !menu.isActive ? "opacity-50" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {menu.children && menu.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleExpand(menu.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              {expandedIds.has(menu.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4"></span>
          )}
          <MenuIcon size={16} className="text-gray-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {menu.name}
              {menu.nameEn && <span className="text-gray-400 ml-2">({menu.nameEn})</span>}
            </div>
            <div className="text-xs text-gray-400">{menu.url}</div>
          </div>
          <span className="text-xs text-gray-400">排序: {menu.sortOrder}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${menu.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {menu.isActive ? "启用" : "禁用"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAdd(menu.id)}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="添加子菜单"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(menu)}
              className="p-1 text-gray-400 hover:text-blue-600"
              title="编辑"
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(menu.id)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {menu.children && menu.children.length > 0 && expandedIds.has(menu.id) && (
          <div>{renderMenuTree(menu.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">菜单管理</h1>
          <p className="text-gray-500 mt-1">管理前台导航菜单，支持多级菜单结构</p>
        </div>
        <button
          type="button"
          onClick={() => handleAdd(null)}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新增菜单
        </button>
      </div>

      {/* 菜单表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "编辑菜单" : "新增菜单"}
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
              <MultiLangTextField
                label="菜单名称"
                valueZh={form.name}
                valueEn={form.nameEn}
                onChangeZh={(v) => setForm((prev) => ({ ...prev, name: v }))}
                onChangeEn={(v) => setForm((prev) => ({ ...prev, nameEn: v }))}
                values={{
                  zh: form.name,
                  en: form.nameEn,
                  ja: form.nameJa,
                  ko: form.nameKo,
                  fr: form.nameFr,
                  ar: form.nameAr,
                }}
                onValuesChange={handleNameValuesChange}
                type="text"
                required={true}
                capitalize={true}
              />
              <div className="mb-1.5 flex justify-end">
                <AiTextButton
                  label="菜单描述"
                  value={form.description || ''}
                  onApply={(text) => setForm((prev) => ({ ...prev, description: text }))}
                  compact
                />
              </div>
              <MultiLangTextField
                label="菜单描述（导航悬浮展示）"
                valueZh={form.description}
                valueEn={form.descriptionEn}
                onChangeZh={(v) => setForm((prev) => ({ ...prev, description: v }))}
                onChangeEn={(v) => setForm((prev) => ({ ...prev, descriptionEn: v }))}
                values={{
                  zh: form.description,
                  en: form.descriptionEn,
                  ja: form.descriptionJa,
                  ko: form.descriptionKo,
                  fr: form.descriptionFr,
                  ar: form.descriptionAr,
                }}
                onValuesChange={handleDescValuesChange}
                type="textarea"
                rows={2}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">链接地址 *</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="/products 或 https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">父菜单</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                >
                  <option value="">无（顶级菜单）</option>
                  {flattenMenus(menus)
                    .filter((m) => m.id !== editingId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="图标名称"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  启用此菜单
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

      {/* 菜单列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {menus.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400">
            暂无菜单，点击右上角“新增菜单”开始创建
          </div>
        ) : (
          <div>{renderMenuTree(menus)}</div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>提示：</strong>菜单管理用于控制前台导航栏显示的菜单项。修改后前台导航菜单会自动更新。支持多级菜单结构，点击菜单前的箭头可展开/收起子菜单。
        </p>
      </div>
    </div>
  );
}
