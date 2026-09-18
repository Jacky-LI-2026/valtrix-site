"use client";

import { useState } from "react";
import { Check, Mail, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * 邮件订阅组件（页脚 / 联系页复用）
 * 订阅成功后即时反馈
 */
export default function EmailSubscribe({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMsg(t("enterEmail") || "请输入邮箱");
      setState("error");
      return;
    }
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: location.pathname, locale }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setState("done");
        setEmail("");
      } else {
        setState("error");
        setMsg(data.error || (t("subscribeFail") || "订阅失败，请稍后重试"));
      }
    } catch {
      setState("error");
      setMsg(t("subscribeFail") || "订阅失败，请稍后重试");
    }
  };

  if (state === "done") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "text-sm" : ""} text-green-600`}>
        <Check size={16} />
        <span>{t("subscribeSuccess") || "订阅成功，感谢您的关注！"}</span>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} className={`flex gap-2 ${compact ? "" : "max-w-md"}`}>
        <div className="relative flex-1">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder") || "输入邮箱地址"}
            className={`w-full rounded-md border border-gray-300 pl-9 pr-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${compact ? "py-2 text-sm" : "py-2.5 text-sm"}`}
            style={{ textAlign: "left" }}
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="flex items-center gap-1.5 px-4 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {state === "loading" ? (
            <span className="text-xs">...</span>
          ) : (
            <>
              <Send size={14} />
              {t("subscribe") || "订阅"}
            </>
          )}
        </button>
      </form>
      {state === "error" && msg && <p className="mt-2 text-xs text-red-500">{msg}</p>}
    </div>
  );
}
