"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unsubscribe", token }),
    })
      .then((r) => r.json())
      .then((d) => setState(d.success ? "done" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        {state === "loading" && <div className="text-gray-500">正在处理退订请求...</div>}
        {state === "done" && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">退订成功</h1>
            <p className="text-sm text-gray-500 mb-6">您已成功退订邮件资讯，将不再收到相关邮件。</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">退订失败</h1>
            <p className="text-sm text-gray-500 mb-6">链接无效或已处理，如需帮助请联系我们。</p>
          </>
        )}
        <Link href="/" className="inline-block px-6 py-2.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center bg-gray-50">加载中...</div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
