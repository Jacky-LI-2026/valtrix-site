"use client";

/**
 * 通用表单生成器 · 后台管理
 * 列表 + 新建/编辑表单定义（多语言标题/描述/字段）+ 提交记录查看/导出
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Eye, Download, Pencil, FileText, X, GripVertical } from "lucide-react";

const LANGS = [
  { key: "zh", label: "中文" },
  { key: "en", label: "English" },
  { key: "ja", label: "日本語" },
  { key: "ko", label: "한국어" },
  { key: "fr", label: "Français" },
  { key: "ar", label: "العربية" },
];

const FIELD_TYPES = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "email", label: "邮箱" },
  { value: "tel", label: "电话" },
  { value: "select", label: "下拉选择" },
  { value: "radio", label: "单选" },
  { value: "checkbox", label: "多选" },
  { value: "date", label: "日期" },
];

interface FormItem {
  id: string;
  name: string;
  slug: string;
  title: any;
  description: any;
  fields: any[];
  submitLabel: any;
  status: string;
  submitCount: number;
  createdAt: string;
}

interface FieldDef {
  key: string;
  label: Record<string, string>;
  type: string;
  required: boolean;
  options?: string[]; // ["值|中文"] 简化编辑
}

function emptyField(): FieldDef {
  return { key: "", label: {}, type: "text", required: false, options: [] };
}

export default function AdminFormsPage() {
  const [list, setList] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // 编辑弹窗
  const [editing, setEditing] = useState<FormItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState<Record<string, string>>({});
  const [formDesc, setFormDesc] = useState<Record<string, string>>({});
  const [submitLabel, setSubmitLabel] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [formStatus, setFormStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  // 提交记录
  const [subsForm, setSubsForm] = useState<FormItem | null>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const r = await fetch(`/api/admin/forms${q}`);
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setFormName(""); setFormSlug(""); setFormTitle({ zh: "" }); setFormDesc({}); setSubmitLabel({ zh: "提交" });
    setFields([{ ...emptyField(), key: "name", label: { zh: "姓名", en: "Name" }, required: true }]);
    setFormStatus("active");
  };

  const openEdit = (f: FormItem) => {
    setIsNew(false);
    setEditing(f);
    setFormName(f.name); setFormSlug(f.slug);
    setFormTitle((f.title as any) || {}); setFormDesc((f.description as any) || {}); setSubmitLabel((f.submitLabel as any) || {});
    const fl = (f.fields || []).map((x: any) => ({ ...x, options: (x.options || []).map((o: any) => `${o.value || ""}|${o.label?.zh || o.label || ""}`) }));
    setFields(fl.length ? fl : [emptyField()]);
    setFormStatus(f.status);
  };

  const closeEdit = () => { setEditing(null); setIsNew(false); };

  const serializeFields = () =>
    fields
      .filter((f) => f.key.trim())
      .map((f) => ({
        key: f.key.trim().toLowerCase().replace(/\s+/g, "_"),
        label: f.label,
        type: f.type,
        required: f.required,
        options: (f.options || []).filter((o) => o.includes("|")).map((o) => {
          const [value, ...rest] = o.split("|");
          const zh = rest.join("|");
          return { value: value.trim(), label: { zh, en: zh } };
        }),
      }));

  const save = async () => {
    if (!formName.trim() || !formSlug.trim()) { alert("名称与标识不能为空"); return; }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        title: Object.fromEntries(LANGS.map((l) => [l.key, formTitle[l.key] || formTitle.zh || ""])),
        description: Object.fromEntries(LANGS.map((l) => [l.key, formDesc[l.key] || ""])),
        submitLabel: Object.fromEntries(LANGS.map((l) => [l.key, submitLabel[l.key] || submitLabel.zh || "提交"])),
        fields: serializeFields(),
        status: formStatus,
      };
      const r = isNew
        ? await fetch("/api/admin/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/admin/forms/${editing?.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.error) { alert("保存失败：" + d.error); return; }
      closeEdit();
      load();
    } catch (e: any) { alert("保存异常：" + e.message); }
    finally { setSaving(false); }
  };

  const remove = async (f: FormItem) => {
    if (!window.confirm(`确认删除表单「${f.name}」及其全部提交记录？`)) return;
    await fetch(`/api/admin/forms/${f.id}`, { method: "DELETE" });
    load();
  };

  const openSubs = async (f: FormItem) => {
    setSubsForm(f); setSubsLoading(true); setSubs([]);
    try {
      const r = await fetch(`/api/admin/forms/${f.id}/submissions`);
      const d = await r.json();
      setSubs(d.list || []);
    } catch { setSubs([]); }
    finally { setSubsLoading(false); }
  };

  const exportCsv = async (f: FormItem) => {
    const a = document.createElement("a");
    a.href = `/api/admin/forms/${f.id}/submissions?format=csv`;
    a.download = `form-${f.slug}.csv`;
    a.click();
  };

  const setFieldLabel = (idx: number, lang: string, v: string) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, label: { ...f.label, [lang]: v } } : f)));
  };

  const fld = (idx: number) => fields[idx] || emptyField();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">通用表单</h1>
          <p className="text-sm text-gray-500">可视化创建自定义表单，前台 /forms/标识 访问，提交自动入库并记录 IP/国家/城市。</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索名称/标识..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500" />
          <button onClick={load} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">搜索</button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"><Plus size={16} /> 新建表单</button>
        </div>
      </div>

      {loading && <div className="text-gray-500">加载中...</div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标识</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{f.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">/forms/{f.slug}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{Array.isArray(f.fields) ? f.fields.length : 0}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{f.submitCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${f.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {f.status === "active" ? "启用" : "停用"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(f.createdAt).toLocaleString("zh-CN")}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/forms/${f.slug}`} target="_blank" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mr-3"><Eye size={14} /> 前台</Link>
                  <button onClick={() => openSubs(f)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mr-3"><FileText size={14} /> 记录</button>
                  <button onClick={() => openEdit(f)} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm mr-3"><Pencil size={14} /> 编辑</button>
                  <button onClick={() => remove(f)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"><Trash2 size={14} /> 删除</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">暂无表单，点击「新建表单」创建</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {(isNew || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{isNew ? "新建表单" : `编辑表单 · ${editing?.name}`}</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表单名称</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">访问标识 slug</label>
                  <input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="如 join-us" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">多语言</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {LANGS.map((l) => (
                    <div key={l.key} className={`grid grid-cols-[80px_1fr_1fr_120px] gap-2 p-2 items-center ${l.key !== "zh" ? "border-t border-gray-100" : ""}`}>
                      <span className="text-xs text-gray-500">{l.label}</span>
                      <input value={formTitle[l.key] || ""} onChange={(e) => setFormTitle((p) => ({ ...p, [l.key]: e.target.value }))} placeholder="标题" className="px-2 py-1.5 border border-gray-200 rounded text-sm" />
                      <input value={formDesc[l.key] || ""} onChange={(e) => setFormDesc((p) => ({ ...p, [l.key]: e.target.value }))} placeholder="描述" className="px-2 py-1.5 border border-gray-200 rounded text-sm" />
                      <input value={submitLabel[l.key] || ""} onChange={(e) => setSubmitLabel((p) => ({ ...p, [l.key]: e.target.value }))} placeholder="按钮文字" className="px-2 py-1.5 border border-gray-200 rounded text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">表单字段</label>
                  <button onClick={() => setFields((p) => [...p, emptyField()])} className="text-xs text-red-600 hover:text-red-800">+ 添加字段</button>
                </div>
                <div className="space-y-3">
                  {fields.map((_, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical size={14} className="text-gray-300" />
                        <input value={fld(idx).key} onChange={(e) => setFields((p) => p.map((f, i) => (i === idx ? { ...f, key: e.target.value } : f)))}
                          placeholder="字段标识（如 name）" className="px-2 py-1.5 border border-gray-200 rounded text-sm w-40 font-mono" />
                        <select value={fld(idx).type} onChange={(e) => setFields((p) => p.map((f, i) => (i === idx ? { ...f, type: e.target.value } : f)))}
                          className="px-2 py-1.5 border border-gray-200 rounded text-sm">
                          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="checkbox" checked={fld(idx).required} onChange={(e) => setFields((p) => p.map((f, i) => (i === idx ? { ...f, required: e.target.checked } : f)))} className="w-3.5 h-3.5" /> 必填
                        </label>
                        <button onClick={() => setFields((p) => p.filter((_, i) => i !== idx))} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {LANGS.map((l) => (
                          <input key={l.key} value={fld(idx).label?.[l.key] || ""} onChange={(e) => setFieldLabel(idx, l.key, e.target.value)}
                            placeholder={`标签(${l.label})`} className="px-2 py-1.5 border border-gray-200 rounded text-sm" />
                        ))}
                      </div>
                      {(fld(idx).type === "select" || fld(idx).type === "radio" || fld(idx).type === "checkbox") && (
                        <textarea value={(fld(idx).options || []).join("\n")} onChange={(e) => setFields((p) => p.map((f, i) => (i === idx ? { ...f, options: e.target.value.split("\n") } : f)))}
                          rows={3} placeholder={"选项，每行一个，格式：值|中文标签（如 office|办公室）"} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={closeEdit} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">取消</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50">{saving ? "保存中..." : "保存表单"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 提交记录弹窗 */}
      {subsForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">提交记录 · {subsForm.name} <span className="text-sm font-normal text-gray-500">（共 {subsForm.submitCount} 条）</span></h2>
              <div className="flex items-center gap-2">
                <button onClick={() => exportCsv(subsForm)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"><Download size={14} /> 导出 CSV</button>
                <button onClick={() => setSubsForm(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="px-6 py-4">
              {subsLoading ? <div className="text-gray-500">加载中...</div> : (
                subs.length === 0 ? <div className="text-gray-400 text-center py-8">暂无提交记录</div> : (
                  <div className="space-y-3">
                    {subs.map((s) => (
                      <div key={s.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-2">
                          <span>{new Date(s.createdAt).toLocaleString("zh-CN")}</span>
                          {s.country && <span>🌍 {s.country}{s.city ? ` · ${s.city}` : ""}</span>}
                          {s.ip && <span className="font-mono">{s.ip}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(s.fieldData || {}).map(([k, v]) => (
                            <div key={k} className="text-sm">
                              <span className="text-gray-400 mr-1.5">{k}:</span>
                              <span className="text-gray-700">{Array.isArray(v) ? v.join(", ") : String(v ?? "")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
