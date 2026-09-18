"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, LayoutList, ExternalLink, Layers, Type, ToggleLeft } from "lucide-react";

interface TypeItem {
  id: string | null;
  name: string;
  label: string;
  model: string;
  fields: any[];
  listColumns: any[];
  titleField: string;
  slugField: string | null;
  enableSeo: boolean;
  enableStatus: boolean;
  dynamic: boolean;
  sortOrder: number;
  active: boolean;
}

const FIELD_KINDS = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "richtext", label: "富文本" },
  { value: "image", label: "图片上传" },
  { value: "video", label: "视频（上传/外链）" },
  { value: "gallery", label: "图片图库（多图）" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "开关" },
  { value: "select", label: "下拉选择" },
  { value: "stringArray", label: "字符串列表" },
  { value: "jsonArray", label: "对象列表" },
];

interface FieldRow {
  name: string;
  label: string;
  kind: string;
  multiLang: boolean;
  required: boolean;
  placeholder?: string;
  jsonFields?: { key: string; label: string }[];
  options?: { label: string; value: string }[];
}

const EMPTY_DEF = {
  name: "",
  label: "",
  labelEn: "",
  description: "",
  titleField: "",
  slugField: "",
  enableSeo: false,
  enableStatus: true,
  sortOrder: 0,
  active: true,
  fields: [] as FieldRow[],
};

export default function ContentTypesPage() {
  const [items, setItems] = useState<TypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TypeItem | null>(null);
  const [viewStatic, setViewStatic] = useState<TypeItem | null>(null);
  const [def, setDef] = useState({ ...EMPTY_DEF });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-types");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addField = () => {
    setDef({
      ...def,
      fields: [...def.fields, { name: "", label: "", kind: "text", multiLang: true, required: false }],
    });
  };

  const updateField = (i: number, patch: Partial<FieldRow>) => {
    const fields = def.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    setDef({ ...def, fields });
  };

  const removeField = (i: number) => {
    setDef({ ...def, fields: def.fields.filter((_, idx) => idx !== i) });
  };

  const openNew = () => {
    setEditing(null);
    setDef({ ...EMPTY_DEF });
    setShowForm(true);
  };

  const openEdit = (it: TypeItem) => {
    if (!it.dynamic) {
      // 静态（内置）类型：打开只读 schema 视图，不弹 alert
      setViewStatic(it);
      return;
    }
    setEditing(it);
    setDef({
      name: it.name,
      label: it.label,
      labelEn: "",
      description: "",
      titleField: it.titleField,
      slugField: it.slugField || "",
      enableSeo: it.enableSeo,
      enableStatus: it.enableStatus,
      sortOrder: it.sortOrder,
      active: it.active,
      fields: (it.fields || []).map((f) => ({
        name: f.name,
        label: f.label,
        kind: f.kind || "text",
        multiLang: !!f.multiLang,
        required: !!f.required,
        placeholder: f.placeholder,
        jsonFields: f.jsonFields,
        options: f.options,
      })),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!def.name || !def.label) {
      alert("类型标识与名称不能为空");
      return;
    }
    if (def.fields.length === 0) {
      alert("至少定义一个字段");
      return;
    }
    const invalid = def.fields.find((f) => !f.name || !f.label);
    if (invalid) {
      alert("字段的名称与标签不能为空");
      return;
    }
    setSaving(true);
    try {
      const titleField = def.titleField || def.fields[0].name;
      const payload = { ...def, titleField, fields: def.fields };
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/admin/content-types/${editing.id}` : "/api/admin/content-types";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        alert("保存失败: " + data.error);
      } else {
        setShowForm(false);
        fetchItems();
      }
    } catch (e: any) {
      alert("保存失败: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: TypeItem) => {
    if (!it.dynamic || !it.id) return;
    if (!window.confirm(`确认删除类型「${it.label}」及其全部内容？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/admin/content-types/${it.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) alert("删除失败: " + data.error);
      else fetchItems();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-dark">内容类型管理</h1>
          <p className="text-dark-500 text-sm mt-1">
            通用内容架构：在后台可视化定义新栏目（内容类型），无需改代码即可获得 CRUD、多语言、翻译、SEO 与前台渲染能力。
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors">
          <Plus size={16} /> 新增内容类型
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-dark-400">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.name} className="bg-white rounded-lg border border-dark-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <LayoutList size={18} className="text-primary" />
                  <span className="font-semibold text-dark">{it.label}</span>
                  {it.dynamic ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-600">动态</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">内置</span>
                  )}
                  {!it.active && <span className="px-2 py-0.5 rounded text-xs bg-yellow-50 text-yellow-600">停用</span>}
                </div>
                <div className="flex items-center gap-1">
                  {it.dynamic ? (
                    <>
                      <button onClick={() => openEdit(it)} className="text-dark-400 hover:text-primary" title="编辑"><Edit size={15} /></button>
                      <button onClick={() => remove(it)} className="text-dark-400 hover:text-red-500" title="删除"><Trash2 size={15} /></button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(it)} className="text-dark-400 hover:text-primary" title="查看"><Edit size={15} /></button>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-dark-400">
                <span className="font-mono">{it.name}</span> · 模型 {it.model} · {it.fields.length} 个字段
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <a href={`/admin/content/${it.name}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-dark-50 text-dark-600 hover:bg-primary/10 hover:text-primary">
                  <Edit size={12} /> 内容管理
                </a>
                {it.slugField && (
                  <a href={`/content/${it.name}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-dark-50 text-dark-600 hover:bg-primary/10 hover:text-primary">
                    <ExternalLink size={12} /> 前台预览
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {it.fields.slice(0, 8).map((f) => (
                  <span key={f.name} className="px-1.5 py-0.5 rounded bg-dark-50 text-[11px] text-dark-500 font-mono">{f.name}</span>
                ))}
                {it.fields.length > 8 && <span className="text-[11px] text-dark-400">+{it.fields.length - 8}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 内置类型只读 schema 视图 */}
      {viewStatic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewStatic(null)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-dark mb-1 flex items-center gap-2">
              <LayoutList size={18} className="text-primary" /> {viewStatic.label}
              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">内置类型</span>
            </h2>
            <p className="text-sm text-dark-400 mb-4">
              内置类型由代码定义（lib/content-types/registry.ts），字段结构不可在后台修改；<b>内容条目可直接在「内容管理」中编辑</b>（列表页支持自定义显示列）。
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(viewStatic.fields || []).map((f) => (
                <span key={f.name} className="px-2 py-1 rounded bg-dark-50 text-xs text-dark-600 font-mono">
                  {f.name}
                  {f.multiLang ? " 🌐" : ""}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <a href={`/admin/content/${viewStatic.name}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded text-sm hover:opacity-90">
                  <Edit size={14} /> 前往内容管理
                </a>
                {viewStatic.slugField && (
                  <a href={`/content/${viewStatic.name}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-4 py-2 border border-dark-200 rounded text-sm text-dark-600 hover:bg-dark-50">
                    <ExternalLink size={14} /> 前台预览
                  </a>
                )}
              </div>
              <button onClick={() => setViewStatic(null)} className="px-4 py-2 border border-dark-200 rounded text-sm text-dark-600 hover:bg-dark-50">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-dark mb-4">{editing ? "编辑内容类型" : "新增内容类型"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">类型标识（URL 段）*</label>
                <input
                  value={def.name}
                  onChange={(e) => setDef({ ...def, name: e.target.value })}
                  disabled={!!editing}
                  placeholder="如：partners（英文/数字/连字符）"
                  className="w-full px-3 py-2 border border-dark-200 rounded disabled:bg-dark-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">中文名称 *</label>
                <input value={def.label} onChange={(e) => setDef({ ...def, label: e.target.value })} placeholder="如：合作伙伴" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">标题字段（用于 slug 生成）</label>
                <input value={def.titleField} onChange={(e) => setDef({ ...def, titleField: e.target.value })} placeholder="默认取第一个字段" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Slug 字段（详情 URL 用）</label>
                <input value={def.slugField} onChange={(e) => setDef({ ...def, slugField: e.target.value })} placeholder="如：slug（留空则无详情页）" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-dark mb-1">类型说明</label>
                <input value={def.description} onChange={(e) => setDef({ ...def, description: e.target.value })} placeholder="描述该栏目用途" className="w-full px-3 py-2 border border-dark-200 rounded" />
              </div>
              <label className="flex items-center gap-2 text-sm text-dark-600">
                <input type="checkbox" checked={def.enableStatus} onChange={(e) => setDef({ ...def, enableStatus: e.target.checked })} /> 启用发布/草稿状态
              </label>
              <label className="flex items-center gap-2 text-sm text-dark-600">
                <input type="checkbox" checked={def.enableSeo} onChange={(e) => setDef({ ...def, enableSeo: e.target.checked })} /> 启用 SEO/GEO 配置
              </label>
            </div>

            {/* 字段编辑器 */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-dark flex items-center gap-2"><Type size={16} className="text-primary" /> 字段定义</h3>
              <button onClick={addField} className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded hover:bg-primary/5 text-sm">
                <Plus size={14} /> 添加字段
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {def.fields.map((f, i) => (
                <div key={i} className="border border-dark-100 rounded p-3 bg-dark-50/40">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <input value={f.name} onChange={(e) => updateField(i, { name: e.target.value })} placeholder="字段名（英文）" className="w-full px-2 py-1.5 border border-dark-200 rounded text-sm" />
                    </div>
                    <div className="col-span-3">
                      <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="字段标签" className="w-full px-2 py-1.5 border border-dark-200 rounded text-sm" />
                    </div>
                    <div className="col-span-2">
                      <select value={f.kind} onChange={(e) => updateField(i, { kind: e.target.value })} className="w-full px-2 py-1.5 border border-dark-200 rounded text-sm bg-white">
                        {FIELD_KINDS.map((k) => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 text-xs text-dark-500">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={f.multiLang} onChange={(e) => updateField(i, { multiLang: e.target.checked })} /> 多语言</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} /> 必填</label>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => removeField(i)} className="text-dark-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {f.kind === "select" && (
                    <div className="mt-2">
                      <div className="text-xs text-dark-500 mb-1">下拉选项（每行一个，格式：标签:值）</div>
                      <textarea
                        rows={2}
                        value={(f.options || []).map((o: any) => `${o.label}:${o.value}`).join("\n")}
                        onChange={(e) => {
                          const opts = e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [label, value] = line.split(":");
                              return { label: (label || "").trim(), value: (value || label || "").trim() };
                            });
                          updateField(i, { options: opts });
                        }}
                        placeholder={"现货:in-stock\n定制:custom"}
                        className="w-full px-2 py-1 border border-dark-200 rounded text-xs font-mono"
                      />
                    </div>
                  )}
                  {f.kind === "jsonArray" && (
                    <div className="mt-2">
                      <div className="text-xs text-dark-500 mb-1">对象字段结构（每行一个，格式：key:标签）</div>
                      <textarea
                        rows={2}
                        value={(f.jsonFields || []).map((j: any) => `${j.key}:${j.label}`).join("\n")}
                        onChange={(e) => {
                          const jfs = e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [key, label] = line.split(":");
                              return { key: (key || "").trim(), label: (label || key || "").trim() };
                            });
                          updateField(i, { jsonFields: jfs });
                        }}
                        placeholder={"title:标题\ndesc:描述"}
                        className="w-full px-2 py-1 border border-dark-200 rounded text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              ))}
              {def.fields.length === 0 && (
                <div className="text-sm text-dark-400 p-4 border border-dashed border-dark-200 rounded text-center">暂无字段，点击「添加字段」定义栏目结构</div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-dark-200 rounded hover:bg-dark-50">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
                {saving ? "保存中..." : "保存类型"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
