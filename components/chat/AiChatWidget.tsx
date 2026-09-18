"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface UiTexts {
  input: string;
  send: string;
  human: string;
  humanHint: string;
  leadTitle: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  leadCompany: string;
  leadMsg: string;
  leadSubmit: string;
  leadSuccess: string;
  fallback: string;
  verifyTitle: string;
  verifyHint: string;
  verifySubmit: string;
  verifyWrong: string;
  verifyPlaceholder: string;
  verifyChecking: string;
  verifyGetCode: string;
  verifyRequired: string;
  verifyFailed: string;
  verifyNetworkError: string;
  leadRequired: string;
  leadSubmitFailed: string;
  leadNetworkError: string;
  chatTitle: string;
  continueChat: string;
  disclaimer: string;
}

const MAX_HISTORY = 8;

export default function AiChatWidget() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ enabled: boolean; name: string; welcome: string; ui: UiTexts } | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadErr, setLeadErr] = useState("");
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", company: "", message: "" });
  const [sessionKey, setSessionKey] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  // 人机验证
  const sessionIdRef = useRef("");
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [verified, setVerified] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [verifyErr, setVerifyErr] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // 初始化：拉取客服配置 + 恢复会话
  useEffect(() => {
    const key = `ai_chat_history_${locale}`;
    setSessionKey(key);
    let cancelled = false;
    fetch(`/api/chat?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setInfo(d);
        try {
          const saved = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(saved) && saved.length) setMsgs(saved.slice(-MAX_HISTORY));
        } catch (e) {}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // 滚动到底部
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, showLead, leadSent]);

  // 会话 ID + 打开时预拉人机验证
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "s" + Date.now() + Math.random().toString(36).slice(2);
    }
    if (open && !verified && !captcha) loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadCaptcha = async () => {
    try {
      const r = await fetch("/api/contact/captcha");
      const d = await r.json();
      if (d?.captchaId) setCaptcha({ id: d.captchaId, question: d.question });
    } catch (e) {}
  };

  const handleVerify = async () => {
    if (!captchaInput.trim()) { setVerifyErr(ui?.verifyRequired || "请输入答案"); return; }
    if (!captcha) { loadCaptcha(); return; }
    setCaptchaLoading(true);
    setVerifyErr("");
    try {
      const res = await fetch("/api/chat?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, captchaId: captcha.id, captchaAnswer: captchaInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setVerified(true);
        setCaptchaInput("");
        setCaptcha(null);
      } else {
        setVerifyErr(ui?.verifyFailed || "验证失败，请重试");
        loadCaptcha();
      }
    } catch (e) {
      setVerifyErr(ui?.verifyNetworkError || "网络异常，请重试");
    } finally {
      setCaptchaLoading(false);
    }
  };

  const persist = useCallback(
    (next: ChatMsg[]) => {
      setMsgs(next);
      if (sessionKey) {
        try {
          localStorage.setItem(sessionKey, JSON.stringify(next.slice(-MAX_HISTORY)));
        } catch (e) {}
      }
    },
    [sessionKey]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!verified) {
      if (!captcha) loadCaptcha();
      return;
    }
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    persist(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale, history: msgs.slice(-6), sessionId: sessionIdRef.current }),
      });
      const data = await res.json();
      if (res.status === 400 && data?.needVerify) {
        setVerified(false);
        if (!captcha) loadCaptcha();
        return;
      }
      if (res.ok && data.reply) {
        persist([...next, { role: "assistant", content: data.reply }]);
        if (data.needHuman) setShowLead(true);
      } else {
        persist([...next, { role: "assistant", content: data?.error || info?.ui?.fallback || "服务暂时不可用" }]);
      }
    } catch (e) {
      persist([...next, { role: "assistant", content: info?.ui?.fallback || "网络异常，请稍后再试" }]);
    } finally {
      setLoading(false);
    }
  };

  const submitLead = async () => {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      setLeadErr(ui?.leadRequired || "姓名与电话必填");
      return;
    }
    setLeadErr("");
    try {
      const res = await fetch("/api/chat?action=lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadForm, locale }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLeadSent(true);
      } else {
        setLeadErr(ui?.leadSubmitFailed || "提交失败，请稍后再试");
      }
    } catch (e) {
      setLeadErr(ui?.leadNetworkError || "网络异常，请稍后再试");
    }
  };

  if (info && info.enabled === false) return null;

  const ui = info?.ui;
  const name = info?.name || ui?.chatTitle || "在线咨询";
  const welcome = info?.welcome || "";

  const inputCls =
    "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="AI Assistant"
        className="print-hidden fixed bottom-4 right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: "var(--color-primary, #CC0000)" }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <path d="M8 9h8M8 13h5"/>
          </svg>
        )}
      </button>

      {/* 聊天窗 */}
      {open && (
        <div className="print-hidden fixed bottom-20 right-4 z-[95] flex w-[calc(100vw-32px)] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
             style={{ height: "min(520px, calc(100vh - 100px))" }}>
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: "var(--color-primary, #CC0000)" }}>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21a6 6 0 0 1 12 0M16 3.5a4 4 0 0 1 0 7.5M22 21a6 6 0 0 0-4-5.65"/></svg>
              <span className="text-sm font-semibold">{name}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* 消息区 */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4">
            {!verified && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-medium text-amber-800">{ui?.verifyTitle || "人机验证"}</p>
                <p className="mb-2 text-xs text-amber-700">{ui?.verifyHint || "请回答下方算式，验证后即可开始对话"}</p>
                {verifyErr && <p className="mb-1 text-xs text-red-500">{verifyErr}</p>}
                {captcha ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border border-amber-300 bg-white px-3 py-2">
                      <span className="text-sm font-semibold text-gray-800">{captcha.question} = ?</span>
                      <button type="button" onClick={loadCaptcha} className="text-xs text-amber-600 hover:text-amber-800" aria-label="refresh captcha">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>
                      </button>
                    </div>
                    <input
                      className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                      placeholder={ui?.verifyPlaceholder || "答案"}
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                    />
                    <button type="button" onClick={handleVerify} disabled={captchaLoading}
                      className="w-full rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--color-primary, #CC0000)" }}>
                      {captchaLoading ? (ui?.verifyChecking || "验证中...") : (ui?.verifySubmit || "验证并开始对话")}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={loadCaptcha} className="text-xs text-amber-600 hover:text-amber-800">{ui?.verifyGetCode || "获取验证码"}</button>
                )}
              </div>
            )}
            {welcome && msgs.length === 0 && verified && (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">{welcome}</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={"max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm " +
                    (m.role === "user" ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-white text-gray-700")}
                  style={m.role === "user" ? { background: "var(--color-primary, #CC0000)" } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            {/* 转人工留资 */}
            {showLead && !leadSent && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <p className="mb-2 text-xs text-blue-700">{ui?.humanHint || "请留下联系方式，我们会尽快与您联系"}</p>
                {leadErr && <p className="mb-1 text-xs text-red-500">{leadErr}</p>}
                <div className="space-y-2">
                  <input className={inputCls} placeholder={ui?.leadName || "姓名"} value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
                  <input className={inputCls} placeholder={ui?.leadPhone || "电话"} value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
                  <input className={inputCls} placeholder={ui?.leadEmail || "邮箱（可选）"} value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
                  <input className={inputCls} placeholder={ui?.leadCompany || "公司（可选）"} value={leadForm.company}
                    onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} />
                  <textarea className={inputCls} rows={2} placeholder={ui?.leadMsg || "需求描述"} value={leadForm.message}
                    onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })} />
                  <button type="button" onClick={submitLead}
                    className="w-full rounded-md px-3 py-2 text-sm font-medium text-white"
                    style={{ background: "var(--color-primary, #CC0000)" }}>
                    {ui?.leadSubmit || "提交"}
                  </button>
                </div>
              </div>
            )}
            {leadSent && (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                {ui?.leadSuccess || "已收到您的信息，我们会尽快与您联系！"}
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="border-t border-gray-100 bg-white px-3 py-3">
            {showLead && !leadSent && (
              <button type="button"
                onClick={() => { setShowLead(false); setLeadForm({ name: "", phone: "", email: "", company: "", message: "" }); }}
                className="mb-2 text-xs text-gray-400 hover:text-gray-600">
                ← {ui?.continueChat || "继续对话"}
              </button>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                placeholder={ui?.input || "请输入您的问题…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" onClick={send} disabled={loading || !input.trim()}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "var(--color-primary, #CC0000)" }}>
                {ui?.send || "发送"}
              </button>
            </div>
          </div>

          {/* 底部说明 */}
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-1.5">
            <p className="text-center text-[10px] leading-snug text-gray-400">{ui?.disclaimer || "AI 智能回复仅供参考，请以官网正式信息为准。"}</p>
          </div>
        </div>
      )}
    </>
  );
}
