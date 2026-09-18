"use client";

import { useEffect, useRef, useState } from "react";
import { X, User, Building2, Phone, Mail, ShieldCheck, Loader2, Send, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getDownloadProfile, markDownloadVerified } from "@/lib/download-gate";

interface DownloadGateModalProps {
  open: boolean;
  resourceName: string;
  downloadUrl?: string;
  /** 审核模式：验证通过后不立即下载，提交待审核留资 */
  requireApproval?: boolean;
  onClose: () => void;
  onVerified: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{6,20}$/;

export default function DownloadGateModal({
  open,
  resourceName,
  downloadUrl,
  requireApproval = false,
  onClose,
  onVerified,
}: DownloadGateModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 打开弹窗时：重置状态，并用已保存的信息预填
  useEffect(() => {
    if (!open) return;
    setError("");
    setNotice("");
    setCode("");
    setCodeSent(false);
    setDevCode(null);
    setDone(false);
    const profile = getDownloadProfile();
    if (profile) {
      setName(profile.name || "");
      setCompany(profile.company || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 禁止背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function handleSendCode() {
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError(t("downloadErrorName"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("downloadErrorEmail"));
      emailInputRef.current?.focus();
      return;
    }
    if (!PHONE_RE.test(phone.trim())) {
      setError(t("downloadErrorPhone"));
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/download/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || t("downloadErrorSendCode"));
        return;
      }
      setCodeSent(true);
      setCountdown(60);
      if (data.devMode && data.code) {
        setDevCode(data.code);
        setNotice(t("downloadDevModeNotice"));
      } else {
        setNotice(t("downloadCodeSent"));
      }
    } catch {
      setError(t("downloadErrorNetwork"));
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t("downloadErrorCode"));
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/download/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          name: name.trim(),
          company: company.trim(),
          phone: phone.trim(),
          resourceName,
          downloadUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || (t("downloadErrorVerificationFailed")));
        return;
      }
      markDownloadVerified({
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      });
      setDone(true);
      // 短暂展示成功状态后触发下载
      setTimeout(() => {
        onVerified();
      }, 400);
    } catch {
      setError(t("downloadErrorNetwork"));
    } finally {
      setVerifying(false);
    }
  }

  const inputClass =
    "w-full ps-10 pe-3 py-2.5 border border-dark-200 rounded-lg text-sm text-dark-700 placeholder-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white";
  const labelClass = "block text-sm font-medium text-dark-700 mb-1.5";
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-dark-300";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("downloadVerifyButton")}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗主体 */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-left">
        {/* 头部 */}
        <div className="bg-primary px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <ShieldCheck size={20} />
              {t("downloadVerifyTitle")}
            </h2>
            <p className="text-white/80 text-xs mt-1 truncate">{resourceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {done ? (
            <div className="text-center py-10">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <p className="font-bold text-dark text-lg">{t("verificationPassed")}</p>
              <p className="text-dark-500 text-sm mt-1">
                {requireApproval ? t("downloadApplySubmit") : t("preparingDownload")}
              </p>
            </div>
          ) : (
            <>
              <p className="text-dark-500 text-sm mb-5 leading-relaxed">
                {t("downloadVerifyDesc")}
              </p>

              <div className="space-y-4">
                {/* 姓名 */}
                <div>
                  <label className={labelClass}>
                    {t("downloadNameLabel")}
                  </label>
                  <div className="relative">
                    <User size={16} className={iconClass} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("downloadNamePlaceholder")}
                      className={inputClass}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 公司 */}
                <div>
                  <label className={labelClass}>
                    {t("downloadCompanyLabel")}
                  </label>
                  <div className="relative">
                    <Building2 size={16} className={iconClass} />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={t("downloadCompanyPlaceholder")}
                      className={inputClass}
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* 手机号 */}
                <div>
                  <label className={labelClass}>
                    {t("downloadPhoneLabel")}
                  </label>
                  <div className="relative">
                    <Phone size={16} className={iconClass} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("downloadPhonePlaceholder")}
                      className={inputClass}
                      maxLength={20}
                    />
                  </div>
                </div>

                {/* 邮箱 + 获取验证码 */}
                <div>
                  <label className={labelClass}>
                    {t("downloadEmailLabel")}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail size={16} className={iconClass} />
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("downloadEmailPlaceholder")}
                        className={inputClass}
                        maxLength={100}
                      />
                    </div>
                    <button
                      onClick={handleSendCode}
                      disabled={sending || countdown > 0}
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                    >
                      {sending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      {countdown > 0 ? `${countdown}s` : t("downloadSendCode")}
                    </button>
                  </div>
                </div>

                {/* 验证码输入 */}
                {codeSent && (
                  <div>
                    <label className={labelClass}>
                      {t("downloadCodeLabel")}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={t("downloadCodePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                )}

                {/* 开发模式验证码提示 */}
                {devCode && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <p className="text-yellow-800 font-medium mb-1">
                      {t("downloadDevCode")}
                    </p>
                    <p className="text-yellow-900 text-xl font-bold tracking-widest">{devCode}</p>
                  </div>
                )}

                {/* 提示/错误信息 */}
                {notice && (
                  <p className="text-sm text-green-600 flex items-start gap-1.5">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    {notice}
                  </p>
                )}
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              {/* 验证并下载 */}
              {codeSent && (
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  {verifying ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  {t("downloadVerifyAndDownload")}
                </button>
              )}

              <p className="text-dark-300 text-xs mt-4 leading-relaxed">
                {t("privacyNotice")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
