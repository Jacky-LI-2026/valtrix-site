"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { memberT } from "@/lib/member-i18n";

const INDUSTRIES = ["semiconductor", "jewelry", "optical", "newEnergy", "quantum", "precision", "other"];

export default function MemberRegisterPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (password !== confirm) {
      setError(memberT(locale, "passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/public/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company, industry, country, phone }),
      });
      const d = await r.json();
      if (d && d.ok) {
        router.push("/member");
      } else {
        setError(d?.error || "error");
      }
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-primary";

  return (
      <>
<PageTitle title={memberT(locale, "registerTitle") || "注册"} fallback="VALTRIX VALTRIX" />
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">{memberT(locale, "registerTitle")}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              {memberT(locale, "company")} <span className="text-gray-400">（{memberT(locale, "optional")}）</span>
            </label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "industry")}</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputCls}
            >
              <option value="">{memberT(locale, "optional")}</option>
              {INDUSTRIES.map((k) => (
                <option key={k} value={k}>{memberT(locale, "industry" + k[0].toUpperCase() + k.slice(1))}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "country")}</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="China / 中国" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{memberT(locale, "confirmPassword")}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className={inputCls}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? "..." : memberT(locale, "register")}
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-500 text-center">
          {memberT(locale, "hasAccount")}{" "}
          <Link href="/member/login" className="text-primary hover:underline">
            {memberT(locale, "toLogin")}
          </Link>
        </p>
      </div>
    </div>
      </>
  );
}
