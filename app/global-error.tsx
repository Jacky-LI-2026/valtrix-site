"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif", background: "#f9fafb", color: "#111827" }}>
        <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ textAlign: "center", maxWidth: "520px" }}>
            <div style={{ fontSize: "96px", fontWeight: 900, color: "rgba(37,99,235,0.1)", lineHeight: 1 }}>500</div>
            <h2 style={{ fontSize: "26px", margin: "16px 0 12px" }}>页面出了点问题</h2>
            <p style={{ color: "#6b7280", margin: "0 0 24px", lineHeight: 1.6 }}>
              很抱歉，页面加载时发生错误。请尝试刷新页面或返回首页。
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#2563eb", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: 500, cursor: "pointer" }}
              >
                重新加载
              </button>
              <a
                href="/"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "2px solid #d1d5db", color: "#374151", padding: "12px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: 500, textDecoration: "none" }}
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
