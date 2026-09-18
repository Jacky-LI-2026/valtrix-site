"use client"

import { useState, useCallback, useEffect } from "react";
import { Plus, UserCog, Trash2, X } from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
  displayName?: string | null;
}

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  status: string;
  isSales?: boolean;
  salesOrder?: number;
  salesProducts?: { id: string }[];
  createdAt: string;
  userRoles?: { id: string; role?: { id: string; name: string; displayName?: string | null } }[];
}

interface UsersManagerProps {
  initialUsers: UserItem[];
  roles: RoleItem[];
  currentUserId?: string;
}

interface FormState {
  username: string;
  displayName: string;
  email: string;
  password: string;
  roleId: string;
  status: string;
  isSales: boolean;
  salesOrder: string;
  salesProductIds: string[]; // 绑定的商城产品 id（仅销售有效）
}

const emptyForm: FormState = { username: "", displayName: "", email: "", password: "", roleId: "", status: "active", isSales: false, salesOrder: "0", salesProductIds: [] };

export default function UsersManager({ initialUsers, roles, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setForm({
      username: u.username,
      displayName: u.displayName || "",
      email: u.email || "",
      password: "",
      roleId: u.userRoles?.[0]?.role?.id ? String(u.userRoles[0].role.id) : "",
      status: u.status,
      isSales: !!u.isSales,
      salesOrder: String(u.salesOrder ?? 0),
      salesProductIds: (u.salesProducts || []).map((p: any) => String(p.id)),
    });
    setShowModal(true);
    setMsg(null);
  };

  const update = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  // 商城产品列表（用于销售绑定产品选择）
  const [shopProducts, setShopProducts] = useState<{ id: string; name: string; nameEn?: string | null; slug: string }[]>([]);
  useEffect(() => {
    fetch("/api/admin/shop/products?limit=100&status=published")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.items)) {
          setShopProducts(d.items.map((x: any) => ({ id: String(x.id), name: x.name || x.slug, nameEn: x.nameEn, slug: x.slug })));
        }
      })
      .catch(() => {});
  }, []);

  const toggleProduct = (pid: string) => {
    setForm((f) => ({
      ...f,
      salesProductIds: f.salesProductIds.includes(pid) ? f.salesProductIds.filter((x) => x !== pid) : [...f.salesProductIds, pid],
    }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: form.displayName,
            email: form.email,
            password: form.password || undefined,
            roleId: form.roleId,
            status: form.status,
            isSales: form.isSales,
            salesOrder: Number(form.salesOrder) || 0,
            salesProductIds: form.salesProductIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "保存失败");
        setUsers((prev) => prev.map((u) => (String(u.id) === String(editing.id) ? data.data : u)));
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, salesOrder: Number(form.salesOrder) || 0 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "新增失败");
        setUsers((prev) => [data.data, ...prev]);
      }
      closeModal();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "操作失败" });
    } finally {
      setSaving(false);
    }
  }, [editing, form]);

  const handleDelete = useCallback(async (u: UserItem) => {
    if (!window.confirm(`确定删除用户「${u.username}」吗？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      setUsers((prev) => prev.filter((x) => String(x.id) !== String(u.id)));
    } catch (e: any) {
      alert(e.message || "删除失败");
    }
  }, []);

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-colors focus:border-[#CC0000]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">用户管理</h1>
            <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400">共 {users.length} 人</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">管理后台用户与角色权限，销售用户可绑定负责的产品</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-[#CC0000] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#aa0000]"
        >
          <Plus size={16} />
          新增用户
        </button>
      </div>

      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="admin-table overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">用户名</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">显示名称</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">邮箱</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">角色</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">销售跟进</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">状态</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">创建时间</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-red-50/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#CC0000] to-[#8a0000] text-sm font-medium text-white">
                      {user.displayName?.[0] || user.username?.[0] || "U"}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.username}</span>
                    {String(user.id) === String(currentUserId) && (
                      <span className="text-xs text-gray-400">（当前）</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{user.displayName}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{user.email || "-"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {user.userRoles?.map((ur) => (
                      <span
                        key={ur.id}
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          ur.role?.name === "admin"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {ur.role?.displayName || ur.role?.name}
                      </span>
                    ))}
                    {(!user.userRoles || user.userRoles.length === 0) && (
                      <span className="text-xs text-gray-400">无角色</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.isSales ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">销售</span>
                      {user.salesOrder ? <span className="text-xs text-gray-400">顺序{user.salesOrder}</span> : null}
                      {user.salesProducts?.length ? (
                        <span className="text-[11px] text-gray-400">绑定{user.salesProducts.length}个产品</span>
                      ) : (
                        <span className="text-[11px] text-red-400">未绑定产品</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {user.status === "active" ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(user)} className="text-gray-400 hover:text-red-600 transition-colors" title="编辑">
                      <UserCog size={16} />
                    </button>
                    {String(user.id) !== String(currentUserId) && (
                      <button onClick={() => handleDelete(user)} className="text-gray-400 hover:text-red-600 transition-colors" title="删除">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">暂无用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-modal-mask fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-modal-panel w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">{editing ? "编辑用户" : "新增用户"}</h3>
              <button onClick={closeModal} className="text-gray-400 transition-colors hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">用户名 *</label>
                <input className={inputCls} value={form.username} disabled={!!editing}
                  onChange={(e) => update("username", e.target.value)}
                  placeholder="3-30 位字母/数字/下划线" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">显示名称</label>
                <input className={inputCls} value={form.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="如：管理员" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">邮箱</label>
                <input className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="选填" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{editing ? "密码（留空则不修改）" : "密码 *"}</label>
                <input className={inputCls} type="password" value={form.password} onChange={(e) => update("password", e.target.value)}
                  placeholder={editing ? "留空保持原密码" : "至少 6 位"} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">角色</label>
                <select className={inputCls} value={form.roleId} onChange={(e) => update("roleId", e.target.value)}>
                  <option value="">请选择角色</option>
                  {roles.map((r) => (
                    <option key={String(r.id)} value={String(r.id)}>{r.displayName || r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                <select className={inputCls} value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">参与销售跟进</div>
                    <div className="text-xs text-gray-400">开启后商城新订单会自动分配/轮转给该用户，并邮件通知</div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={form.isSales} onChange={(e) => update("isSales", e.target.checked)} />
                    <div className="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-red-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {form.isSales && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">轮转顺序（数字小优先接单）</label>
                    <input className={inputCls} type="number" value={form.salesOrder}
                      onChange={(e) => update("salesOrder", e.target.value)} placeholder="0" />
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-500">绑定销售产品（仅可接待这些产品的订单）</label>
                        <span className="text-[11px] text-gray-400">已选 {form.salesProductIds.length} 个</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
                        {shopProducts.length === 0 && <div className="text-xs text-gray-400 p-2">暂无上架商品</div>}
                        {shopProducts.map((p) => {
                          const checked = form.salesProductIds.includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm ${checked ? "bg-red-50 text-red-700" : "hover:bg-gray-50"}`}>
                              <input type="checkbox" className="rounded" checked={checked} onChange={() => toggleProduct(p.id)} />
                              <span className="truncate">{p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      {form.salesProductIds.length === 0 && form.isSales && (
                        <div className="mt-1 text-[11px] text-amber-600">未绑定产品时不会收到任何订单分配</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button onClick={closeModal} className="rounded-md px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-md bg-[#CC0000] px-4 py-2 text-sm text-white transition-colors hover:bg-[#aa0000] disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
