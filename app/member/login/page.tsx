"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { memberT } from "@/lib/member-i18n";

export default function MemberLoginPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 忘记密码状态
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [devCode, setDevCode] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/public/member?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (d && d.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next && next.startsWith("/") ? next : "/member");
      } else {
        setError(d?.error || "error");
      }
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    setError("");
    setResetMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/public/member?action=forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const d = await r.json();
      if (d && d.ok) {
        setSent(true);
        setResetMsg(d.message || "sent");
        if (d.devMode && d.code) setDevCode(d.code);
      } else {
        setError(d?.error || "error");
      }
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  const resetPwd = async () => {
    setError("");
    setResetMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/public/member?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code, password: newPassword }),
      });
      const d = await r.json();
      if (d && d.ok) {
        setResetMsg(d.message || "ok");
        // 重置成功回到登录页
        setTimeout(() => {
          setMode("login");
          setSent(false);
          setResetMsg("");
          setDevCode("");
          setCode("");
          setNewPassword("");
          setResetEmail("");
          setEmail(resetEmail);
        }, 1500);
      } else {
        setError(d?.error || "error");
      }
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <>
<PageTitle title={memberT(locale, "loginTitle") || "登录"} fallback="VALTRIX VALTRIX" />
      <div className="container max-w-md py-16">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">{memberT(locale, "forgotPassword")}</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "email")}</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary"
              />
            </div>
            {!sent ? (
              <button
                onClick={sendCode}
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {loading ? "..." : memberT(locale, "sendCode")}
              </button>
            ) : (
              <>
                {resetMsg && <p className="text-sm text-green-600">{resetMsg}</p>}
                {devCode && (
                  <p className="text-sm text-amber-600">
                    {memberT(locale, "devModeCode")}: <b>{devCode}</b>
                  </p>
                )}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "resetCode")}</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "newPassword")}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={resetPwd}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {loading ? "..." : memberT(locale, "resetPassword")}
                </button>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={() => { setMode("login"); setError(""); setResetMsg(""); setDevCode(""); setSent(false); }}
              className="text-sm text-gray-500 hover:underline"
            >
              ← {memberT(locale, "backToLogin")}
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">{memberT(locale, "loginTitle")}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => { setMode("forgot"); setError(""); }} className="text-sm text-gray-500 hover:underline">
              {memberT(locale, "forgotPassword")}?
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? "..." : memberT(locale, "login")}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          {memberT(locale, "noAccount")}{" "}
          <Link href="/member/register" className="text-primary hover:underline">
            {memberT(locale, "toRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}
