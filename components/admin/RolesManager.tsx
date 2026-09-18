"use client"

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Shield, ChevronDown, ChevronRight } from "lucide-react";

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  rolePermissions?: { id: string; permission?: PermissionItem }[];
  _count?: { userRoles: number };
}

interface RolesManagerProps {
  initialRoles: RoleItem[];
  permissions: PermissionItem[];
}

interface FormState {
  name: string;
  displayName: string;
  description: string;
  permissionIds: string[];
}

const emptyForm: FormState = { name: "", displayName: "", description: "", permissionIds: [] };

export default function RolesManager({ initialRoles, permissions }: RolesManagerProps) {
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 权限按模块分组
  const moduleGroups: { module: string; perms: PermissionItem[] }[] = (() => {
    const map = new Map<string, PermissionItem[]>();
    permissions.forEach((p) => {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    });
    return Array.from(map.entries()).map(([module, perms]) => ({ module, perms }));
  })();

  const moduleLabel: Record<string, string> = {
    product: "产品", news: "新闻", resource: "资源", industry: "行业方案", service: "服务",
    career: "招聘职位", about: "关于我们", menu: "菜单", lead: "留言线索",
    "download-lead": "下载留资", analytics: "访客统计", config: "站点/主题/首页配置",
    ai: "大模型", collect: "采集", language: "语种管理", "page-hero": "页面头部",
    template: "模板", deploy: "部署", guide: "说明书", smtp: "SMTP",
    "translate-config": "翻译配置", seo: "SEO配置", "auto-collection": "自动采集",
    license: "授权管理", notification: "通知", setup: "初始化", system: "系统管理",
  };

  const toggleModule = (module: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setMsg(null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
    setMsg(null);
  };

  const openEdit = (r: RoleItem) => {
    setEditing(r);
    setForm({
      name: r.name,
      displayName: r.displayName,
      description: r.description || "",
      permissionIds: (r.rolePermissions || []).map((rp) => String(rp.permission?.id || "")).filter(Boolean),
    });
    setShowModal(true);
    setMsg(null);
  };

  const togglePerm = (id: string) => {
    setForm((f) => {
      const has = f.permissionIds.includes(id);
      return { ...f, permissionIds: has ? f.permissionIds.filter((x) => x !== id) : [...f.permissionIds, id] };
    });
  };

  const toggleModuleAll = (module: string, perms: PermissionItem[]) => {
    const ids = perms.map((p) => String(p.id));
    setForm((f) => {
      const allSelected = ids.every((x) => f.permissionIds.includes(x));
      if (allSelected) {
        return { ...f, permissionIds: f.permissionIds.filter((x) => !ids.includes(x)) };
      }
      const set = new Set([...f.permissionIds, ...ids]);
      return { ...f, permissionIds: Array.from(set) };
    });
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        name: form.name,
        displayName: form.displayName,
        description: form.description,
        permissionIds: form.permissionIds,
      };
      if (editing) {
        const res = await fetch(`/api/admin/roles/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "保存失败");
        setRoles((prev) => prev.map((r) => (String(r.id) === String(editing.id) ? data.data : r)));
      } else {
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "新增失败");
        setRoles((prev) => [...prev, data.data]);
      }
      closeModal();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "操作失败" });
    } finally {
      setSaving(false);
    }
  }, [editing, form]);

  const handleDelete = useCallback(async (r: RoleItem) => {
    if (!window.confirm(`确定删除角色「${r.displayName}」吗？`)) return;
    try {
      const res = await fetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      setRoles((prev) => prev.filter((x) => String(x.id) !== String(r.id)));
    } catch (e: any) {
      alert(e.message || "删除失败");
    }
  }, []);

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色设置</h1>
          <p className="text-gray-500 mt-1">管理后台角色，并为其分配权限与栏目</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新增角色
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-md text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {r.displayName}
                    {r.name === "admin" && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">内置</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{r.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="编辑">
                  <Pencil size={15} />
                </button>
                {r.name !== "admin" && (
                  <button onClick={() => handleDelete(r)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="删除">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            {r.description && <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>}
            <div className="mt-auto flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-2">
              <span>{r.rolePermissions?.length ?? 0} 项权限</span>
              <span>{r._count?.userRoles ?? 0} 个用户</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "编辑角色" : "新增角色"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">角色标识 *</label>
                  <input className={inputCls} value={form.name} disabled={!!editing}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="如：operator（2-30 位字母/数字/下划线）" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">角色名称 *</label>
                  <input className={inputCls} value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    placeholder="如：运营人员" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
                <input className={inputCls} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="角色用途说明（选填）" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-500">权限与栏目（勾选后对应后台栏目对拥有该角色的用户可见可用）</label>
                  <span className="text-xs text-gray-400">已选 {form.permissionIds.length} 项</span>
                </div>
                <div className="border border-gray-200 rounded-md divide-y divide-gray-50">
                  {moduleGroups.map((g) => {
                    const isOpen = expanded.has(g.module);
                    const ids = g.perms.map((p) => String(p.id));
                    const allSel = ids.every((x) => form.permissionIds.includes(x));
                    return (
                      <div key={g.module}>
                        <div
                          onClick={() => toggleModule(g.module)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium text-gray-700">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {moduleLabel[g.module] || g.module}
                            <span className="text-xs text-gray-400 font-normal">({g.perms.length})</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {!editing || editing.name !== "admin" ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleModuleAll(g.module, g.perms); }}
                                className={`text-xs px-2 py-0.5 rounded border ${allSel ? "bg-red-600 text-white border-red-600" : "text-gray-500 border-gray-300 hover:bg-gray-50"}`}
                              >
                                {allSel ? "全不选" : "全选"}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300">内置全权限</span>
                            )}
                          </span>
                        </div>
                        {isOpen && (
                          <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                            {g.perms.map((p) => {
                              const checked = form.permissionIds.includes(String(p.id));
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 cursor-pointer border ${checked ? "border-red-200 bg-red-50 text-red-700" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-red-600"
                                    checked={checked}
                                    disabled={!!editing && editing.name === "admin"}
                                    onChange={() => togglePerm(String(p.id))}
                                  />
                                  {p.name}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
