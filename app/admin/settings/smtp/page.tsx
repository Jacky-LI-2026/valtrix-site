"use client";

import { useEffect, useState } from "react";
import { Save, Send, Mail, ShieldCheck, RefreshCw, Info } from "lucide-react";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  configured: boolean;
}

const EMPTY: SmtpConfig = {
  host: "",
  port: 465,
  secure: true,
  user: "",
  pass: "",
  from: "",
  fromName: "VALTRIX",
  configured: false,
};

export default function SmtpSettingsPage() {
  const [form, setForm] = useState<SmtpConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/smtp", { cache: "no-store" });
        const data = await res.json();
        if (data.ok && data.config) setForm({ ...EMPTY, ...data.config });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          port: form.port,
          secure: form.secure,
          user: form.user,
          pass: form.pass, // 留空 = 保留原密码
          from: form.from,
          fromName: form.fromName,
        }),
      });
      const data = await res.json();
      setMsg({ type: data.ok ? "ok" : "err", text: data.message || (data.ok ? "保存成功" : "保存失败") });
      if (data.config) setForm({ ...EMPTY, ...data.config });
    } catch (e: any) {
      setMsg({ type: "err", text: "保存失败：" + (e?.message || "未知错误") });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!testTo.trim()) {
      setMsg({ type: "err", text: "请先填写测试收件邮箱" });
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings/smtp?action=test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      setMsg({ type: data.ok ? "ok" : "err", text: data.message || (data.ok ? "发送成功" : "发送失败") });
    } catch (e: any) {
      setMsg({ type: "err", text: "测试失败：" + (e?.message || "未知错误") });
    } finally {
      setTesting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">SMTP 邮件服务</h1>
          <p className="text-gray-500 mt-1">配置后用于发送下载验证码邮件与留言通知邮件，无需改代码</p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            form.configured
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-amber-50 text-amber-600 border border-amber-200"
          }`}
        >
          <ShieldCheck size={14} />
          {form.configured ? "邮件服务已启用" : "开发模式（未配置完整）"}
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            msg.type === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 space-y-5">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> 加载中...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SMTP 服务器地址 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={form.host}
                  onChange={(e) => set("host", e.target.value)}
                  placeholder="如 smtp.qq.com / smtp.exmail.qq.com / smtp.aliyun.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  端口 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  type="number"
                  value={form.port}
                  onChange={(e) => set("port", Number(e.target.value))}
                  placeholder="465 或 587"
                />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.secure}
                    onChange={(e) => set("secure", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  使用 SSL/TLS 加密（465 端口开启）
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  邮箱账号 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={form.user}
                  onChange={(e) => set("user", e.target.value)}
                  placeholder="发件邮箱账号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  授权码 / 密码 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  type="password"
                  value={form.pass}
                  onChange={(e) => set("pass", e.target.value)}
                  placeholder={form.pass === "******" ? "已保存（留空则不修改）" : "QQ/163 等请填授权码"}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">发件人地址（可空）</label>
                <input
                  className={inputCls}
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                  placeholder="留空默认用邮箱账号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">发件人显示名（可空）</label>
                <input
                  className={inputCls}
                  value={form.fromName}
                  onChange={(e) => set("fromName", e.target.value)}
                  placeholder="VALTRIX"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Save size={15} /> {saving ? "保存中..." : "保存配置"}
              </button>
            </div>

            {/* 测试发信 */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Mail size={15} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">发送测试邮件</span>
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="填写测试收件邮箱"
                />
                <button
                  onClick={test}
                  disabled={testing || !form.configured}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <Send size={15} /> {testing ? "发送中..." : "发送测试"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                提示：测试发信前请先「保存配置」；QQ/163/企业微信邮箱需要在邮箱设置里开启 SMTP 并生成授权码。
              </p>
            </div>

            {/* 设置说明 */}
            <div className="pt-4 border-t border-gray-100">
              <details open>
                <summary className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
                  <Info size={15} className="text-gray-500" />
                  设置说明（常见邮箱 SMTP 参数与授权码获取）
                </summary>
                <div className="mt-3 space-y-4 text-sm text-gray-600">
                  {/* 常见服务商参数表 */}
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs">
                          <th className="px-3 py-2 font-medium">邮箱服务商</th>
                          <th className="px-3 py-2 font-medium">SMTP 服务器</th>
                          <th className="px-3 py-2 font-medium">端口</th>
                          <th className="px-3 py-2 font-medium">加密</th>
                          <th className="px-3 py-2 font-medium">授权码获取方式</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">QQ 邮箱</td>
                          <td className="px-3 py-2 whitespace-nowrap">smtp.qq.com</td>
                          <td className="px-3 py-2">465</td>
                          <td className="px-3 py-2">SSL</td>
                          <td className="px-3 py-2">邮箱设置 → 账户 → 开启 POP3/SMTP → 生成授权码</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">QQ 企业邮箱</td>
                          <td className="px-3 py-2 whitespace-nowrap">smtp.exmail.qq.com</td>
                          <td className="px-3 py-2">465</td>
                          <td className="px-3 py-2">SSL</td>
                          <td className="px-3 py-2">企业邮箱管理后台 → 成员与邮件设置 → 开启 SMTP</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">163 / 126 邮箱</td>
                          <td className="px-3 py-2 whitespace-nowrap">smtp.163.com</td>
                          <td className="px-3 py-2">465</td>
                          <td className="px-3 py-2">SSL</td>
                          <td className="px-3 py-2">设置 → POP3/SMTP/IMAP → 开启 → 新增授权码（客户端授权密码）</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">阿里云企业邮箱</td>
                          <td className="px-3 py-2 whitespace-nowrap">smtp.qiye.aliyun.com</td>
                          <td className="px-3 py-2">465</td>
                          <td className="px-3 py-2">SSL</td>
                          <td className="px-3 py-2">企业邮箱管理后台 → 邮箱设置 → 开启 SMTP 发信</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">Gmail</td>
                          <td className="px-3 py-2 whitespace-nowrap">smtp.gmail.com</td>
                          <td className="px-3 py-2">465</td>
                          <td className="px-3 py-2">SSL</td>
                          <td className="px-3 py-2">Google 账户 → 安全 → 开启两步验证 → 应用专用密码</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap">通用（任意 SMTP）</td>
                          <td className="px-3 py-2 whitespace-nowrap">按服务商提供</td>
                          <td className="px-3 py-2">465 / 587</td>
                          <td className="px-3 py-2">SSL / STARTTLS</td>
                          <td className="px-3 py-2">端口 465 勾选 SSL；端口 587 取消勾选（用 STARTTLS）</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 分步说明 */}
                  <div className="space-y-2.5">
                    <p className="font-medium text-gray-700">配置步骤：</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1">
                      <li>在「邮箱设置」中开启 SMTP 服务，获取<b>授权码</b>（不是邮箱登录密码）。</li>
                      <li>在上方表单填入 SMTP 服务器地址、端口（465 选 SSL）、邮箱账号和授权码。</li>
                      <li>点「保存配置」，状态徽章变为「邮件服务已启用」即配置生效。</li>
                      <li>填一个收件邮箱点「发送测试」，收到测试邮件即代表配置完全可用。</li>
                    </ol>
                  </div>

                  {/* 常见问题 */}
                  <div className="space-y-2.5">
                    <p className="font-medium text-gray-700">常见问题排查：</p>
                    <ul className="space-y-1.5">
                      <li>
                        <span className="text-gray-500">· 提示&ldquo;验证码邮件发送失败&rdquo;：</span>
                        授权码错误、SMTP 服务未开启、或服务器安全组未放行对应端口（生产环境发信端口需在防火墙/安全组放行）。
                      </li>
                      <li>
                        <span className="text-gray-500">· 端口 465 与 587 的区别：</span>
                        465 使用 SSL 加密（勾选&ldquo;使用 SSL/TLS&rdquo;）；587 使用 STARTTLS（取消勾选）。
                      </li>
                      <li>
                        <span className="text-gray-500">· 密码框显示&ldquo;已保存（留空则不修改）&rdquo;：</span>
                        表示已保存过授权码，重新保存时留空可保留原值；如需更换授权码直接填入新值即可。
                      </li>
                      <li>
                        <span className="text-gray-500">· 想停用邮件服务回到开发模式：</span>
                        把「服务器地址」和「邮箱账号」都清空后保存即可（密码一并清除）。
                      </li>
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
