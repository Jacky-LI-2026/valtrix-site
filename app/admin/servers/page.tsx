"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Server, Save, Eye, EyeOff, CheckCircle, AlertCircle, Plug, Loader2, Activity } from "lucide-react";

interface ServerItem {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  deployPath: string;
  processManager: string;
  domain: string | null;
  isActive: boolean;
  sortOrder: number;
  hasPassword: boolean;
  hasPrivateKey: boolean;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  aliyun: "阿里云",
  usa: "美国服务器",
  other: "其他",
};

const typeColors: Record<string, string> = {
  aliyun: "bg-orange-100 text-orange-700",
  usa: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  name: "",
  type: "aliyun",
  host: "",
  port: 22,
  username: "root",
  password: "",
  privateKey: "",
  deployPath: "/var/www/your-app",
  processManager: "pm2",
  processName: "your-pm2-app-name",
  domain: "",
  nginxPath: "",
  branch: "main",
  nodeVersion: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

export default function ServersAdminPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null); // 正在测试的服务器 id
  const [testingForm, setTestingForm] = useState(false); // 表单内测试中
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    elapsed?: string;
    details?: {
      system?: string;
      nodeVersion?: string;
      pnpmVersion?: string;
      deployPath?: string;
      deployDirExists?: boolean;
      deployDirWritable?: boolean;
    };
  } | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/admin/servers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setServers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowPassword(false);
    setShowForm(true);
  };

  const handleEdit = async (server: ServerItem) => {
    setEditingId(server.id);
    setShowPassword(false);
    // 获取详情（含密码和私钥）
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`);
      const data = await res.json();
      setForm({
        name: data.name || "",
        type: data.type || "other",
        host: data.host || "",
        port: data.port || 22,
        username: data.username || "",
        password: data.password || "",
        privateKey: data.privateKey || "",
        deployPath: data.deployPath || "",
        processManager: data.processManager || "pm2",
        processName: data.processName || "",
        domain: data.domain || "",
        nginxPath: data.nginxPath || "",
        branch: data.branch || "main",
        nodeVersion: data.nodeVersion || "",
        description: data.description || "",
        isActive: data.isActive !== undefined ? data.isActive : true,
        sortOrder: data.sortOrder || 0,
      });
    } catch (e) {
      console.error(e);
      setForm({ ...emptyForm, name: server.name, host: server.host, username: server.username, deployPath: server.deployPath });
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个服务器配置吗？")) return;
    try {
      const res = await fetch(`/api/admin/servers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "服务器删除成功" });
        fetchServers();
      } else {
        setMessage({ type: "error", text: data.error || "删除失败" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "删除失败" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.host || !form.username || !form.deployPath) {
      setMessage({ type: "error", text: "请填写必填项（名称、主机、用户名、部署路径）" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const payload: any = { ...form };
      // 编辑时，如果密码为空则不更新（保留原密码）
      if (editingId && !form.password) {
        delete payload.password;
      }
      if (editingId && !form.privateKey) {
        delete payload.privateKey;
      }

      const url = editingId ? `/api/admin/servers/${editingId}` : "/api/admin/servers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success || data.id) {
        setMessage({ type: "success", text: editingId ? "服务器更新成功" : "服务器创建成功" });
        setShowForm(false);
        fetchServers();
      } else {
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "保存失败" });
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  // 测试已保存服务器连接
  const handleTestSaved = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: "测试请求失败，请稍后重试" });
    } finally {
      setTestingId(null);
    }
  };

  // 测试表单中未保存的连接信息
  const handleTestForm = async () => {
    if (!form.host || !form.username) {
      setMessage({ type: "error", text: "请先填写主机和用户名" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!form.password && !form.privateKey) {
      setMessage({ type: "error", text: "请先填写 SSH 密码或私钥" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setTestingForm(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
          privateKey: form.privateKey,
          deployPath: form.deployPath,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: "测试请求失败，请稍后重试" });
    } finally {
      setTestingForm(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">服务器管理</h1>
          <p className="text-gray-500 mt-1">管理部署服务器配置，支持阿里云、美国服务器等多环境</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新增服务器
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-md ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* 服务器列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">服务器名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">主机</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">端口</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部署路径</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">凭证</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {servers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <Server size={40} className="mx-auto mb-3 opacity-30" />
                  暂无服务器，点击右上角“新增服务器”开始配置
                </td>
              </tr>
            ) : (
              servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{server.name}</div>
                    {server.domain && <div className="text-xs text-gray-400 mt-0.5">{server.domain}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${typeColors[server.type] || typeColors.other}`}>
                      {typeLabels[server.type] || server.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{server.host}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{server.port}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{server.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{server.deployPath}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {server.hasPassword && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">密码</span>}
                      {server.hasPrivateKey && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">密钥</span>}
                      {!server.hasPassword && !server.hasPrivateKey && <span className="text-xs text-red-500">无凭证</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${server.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {server.isActive ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleTestSaved(server.id)}
                        disabled={testingId === server.id}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="测试连接"
                      >
                        {testingId === server.id ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(server)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(server.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/编辑表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "编辑服务器" : "新增服务器"}
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
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务器名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="如：阿里云生产服务器"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务器类型</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="aliyun">阿里云</option>
                    <option value="usa">美国服务器</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              {/* SSH连接 */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">SSH 连接信息</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">主机 IP / 域名 *</label>
                    <input
                      type="text"
                      value={form.host}
                      onChange={(e) => setForm({ ...form, host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono"
                      placeholder="123.45.67.89 或 example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH 端口</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 22 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH 用户名 *</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="root"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SSH 密码 {editingId && <span className="text-xs text-gray-400">（留空不修改）</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SSH 私钥 {editingId && <span className="text-xs text-gray-400">（留空不修改，PEM格式）</span>}
                  </label>
                  <textarea
                    value={form.privateKey}
                    onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono text-xs"
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  />
                </div>
              </div>

              {/* 部署配置 */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">部署配置</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">项目部署路径 *</label>
                  <input
                    type="text"
                    value={form.deployPath}
                    onChange={(e) => setForm({ ...form, deployPath: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono"
                    placeholder="/var/www/your-app"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">进程管理工具</label>
                    <select
                      value={form.processManager}
                      onChange={(e) => setForm({ ...form, processManager: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="pm2">PM2</option>
                      <option value="systemd">Systemd</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">进程名称</label>
                    <input
                      type="text"
                      value={form.processName}
                      onChange={(e) => setForm({ ...form, processName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="your-pm2-app-name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Git 分支</label>
                    <input
                      type="text"
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="main"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Node 版本</label>
                    <input
                      type="text"
                      value={form.nodeVersion}
                      onChange={(e) => setForm({ ...form, nodeVersion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="20.x（可选）"
                    />
                  </div>
                </div>
              </div>

              {/* 网站配置 */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">网站配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">网站域名</label>
                    <input
                      type="text"
                      value={form.domain}
                      onChange={(e) => setForm({ ...form, domain: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="https://www.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nginx 配置路径</label>
                    <input
                      type="text"
                      value={form.nginxPath}
                      onChange={(e) => setForm({ ...form, nginxPath: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono"
                      placeholder="/etc/nginx/conf.d/your-app.conf"
                    />
                  </div>
                </div>
              </div>

              {/* 其他 */}
              <div className="border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="服务器用途、注意事项等"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">启用此服务器</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleTestForm}
                  disabled={testingForm}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {testingForm ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                  {testingForm ? "测试中..." : "测试连接"}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 测试结果弹窗 */}
      {testResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTestResult(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b rounded-t-lg ${testResult.success ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <AlertCircle size={20} className="text-red-600" />
                )}
                <h3 className={`font-semibold ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                  {testResult.success ? "连接测试通过" : "连接测试失败"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {testResult.success ? (
                <>
                  {testResult.elapsed && (
                    <div className="text-sm text-gray-500">连接耗时：<span className="font-medium text-green-600">{testResult.elapsed}</span></div>
                  )}
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    {testResult.details?.system && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">系统</span>
                        <span className="text-gray-800 font-mono text-xs break-all">{testResult.details.system}</span>
                      </div>
                    )}
                    {testResult.details?.nodeVersion && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">Node</span>
                        <span className="text-gray-800 font-mono text-xs">{testResult.details.nodeVersion}</span>
                      </div>
                    )}
                    {testResult.details?.pnpmVersion && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">pnpm</span>
                        <span className="text-gray-800 font-mono text-xs">{testResult.details.pnpmVersion}</span>
                      </div>
                    )}
                    {testResult.details?.deployPath && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">部署目录</span>
                        <div className="flex-1">
                          <div className="text-gray-800 font-mono text-xs break-all">{testResult.details.deployPath}</div>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${testResult.details.deployDirExists ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {testResult.details.deployDirExists ? "目录存在" : "目录不存在（部署时会自动创建）"}
                            </span>
                            {testResult.details.deployDirExists && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${testResult.details.deployDirWritable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {testResult.details.deployDirWritable ? "可写" : "不可写"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 bg-red-50 rounded-md p-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm text-red-800">{testResult.error || "连接失败"}</div>
                    <div className="text-xs text-red-500 mt-1">请检查主机地址、SSH 端口、用户名、密码/密钥，以及云服务器安全组是否放行 SSH 端口</div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
