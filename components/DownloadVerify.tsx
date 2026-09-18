"use client";

import { useState, useEffect } from "react";
import { Download, Mail, Phone, Building, User, Send, CheckCircle, X, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DownloadVerifyProps {
  resourceName: string;
  fileUrl: string;
  onClose?: () => void;
}

export default function DownloadVerify({ resourceName, fileUrl, onClose }: DownloadVerifyProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<"form" | "code" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [devCode, setDevCode] = useState("");

  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    code: "",
  });

  const setMsg = (text: string, err: boolean) => {
    setMessage(text);
    setIsError(err);
  };

  // 检查是否已验证（使用localStorage）
  useEffect(() => {
    const verified = localStorage.getItem("download_verified");
    if (verified) {
      const data = JSON.parse(verified);
      if (Date.now() < data.expires) {
        setStep("success");
        setForm({ ...form, email: data.email });
      } else {
        localStorage.removeItem("download_verified");
      }
    }
  }, []);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCode = async () => {
    if (!form.email) {
      setMsg(t("dvEnterEmail"), true);
      return;
    }
    setSendingCode(true);
    setMsg("", false);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, type: "download" }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
        setCountdown(60);
        if (data.devCode) {
          setDevCode(data.devCode);
        }
        setMsg(t("dvCodeSent"), false);
      } else {
        setMsg(data.error || t("dvSendFailedShort"), true);
      }
    } catch (e) {
      setMsg(t("dvSendFailed"), true);
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!form.code) {
      setMsg(t("dvEnterCode"), true);
      return;
    }
    setLoading(true);
    setMsg("", false);
    try {
      const res = await fetch("/api/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: form.code,
          name: form.name,
          company: form.company,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("download_verified", JSON.stringify({
          email: form.email,
          token: data.token,
          expires: Date.now() + 24 * 60 * 60 * 1000,
        }));
        setStep("success");
        setMsg(t("dvVerifySuccess"), false);
      } else {
        setMsg(data.error || t("dvVerifyFailedShort"), true);
      }
    } catch (e) {
      setMsg(t("dvVerifyFailed"), true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = resourceName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-left">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-white" />
            <h3 className="text-lg font-semibold text-white">{t("dvDownloadResource")}</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* 资源名称 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t("dvResourceName")}</p>
            <p className="text-sm font-medium text-gray-900">{resourceName}</p>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center mb-6">
            {[
              { key: "form", label: t("dvFillInfo") },
              { key: "code", label: t("dvEmailVerify") },
              { key: "success", label: t("dvDownload") },
            ].map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s.key ? "bg-red-600 text-white" :
                  (step === "success" || (step === "code" && s.key === "form")) ? "bg-green-500 text-white" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {(step === "success" || (step === "code" && s.key === "form")) ? <CheckCircle size={16} /> : index + 1}
                </div>
                <span className={`ml-2 text-xs ${step === s.key ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  {s.label}
                </span>
                {index < 2 && <div className={`w-8 h-0.5 mx-2 ${step === "success" || (step === "code" && s.key === "form") ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              isError
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              {message}
            </div>
          )}

          {/* 步骤1：填写信息 */}
          {step === "form" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />{t("dvName")} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder={t("dvNamePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building size={14} className="inline mr-1" />{t("dvCompany")}
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder={t("dvCompanyPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" />{t("dvPhone")} *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder={t("dvPhonePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={14} className="inline mr-1" />{t("dvEmail")} *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder={t("dvEmailPlaceholder")}
                />
              </div>
              <button
                onClick={sendCode}
                disabled={sendingCode || !form.name || !form.phone || !form.email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingCode ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendingCode ? t("dvSending") : t("dvGetCode")}
              </button>
            </div>
          )}

          {/* 步骤2：输入验证码 */}
          {step === "code" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("dvEmailCode")} *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder={t("dvEnter6Code")}
                    maxLength={6}
                  />
                  <button
                    onClick={sendCode}
                    disabled={countdown > 0 || sendingCode}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : t("dvResend")}
                  </button>
                </div>
                {devCode && (
                  <p className="mt-2 text-xs text-gray-400">{t("dvDevCode")}：{devCode}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {t("dvBack")}
                </button>
                <button
                  onClick={verifyCode}
                  disabled={loading || !form.code}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {loading ? t("dvVerifying") : t("dvVerifyAndDownload")}
                </button>
              </div>
            </div>
          )}

          {/* 步骤3：下载 */}
          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{t("dvVerified")}</h4>
                <p className="text-sm text-gray-500">{t("dvVerifiedDesc")}</p>
                <p className="text-xs text-gray-400 mt-2">{t("dvValid24h")}</p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Download size={16} />
                {t("dvDownloadNow")}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  {t("dvClose")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
