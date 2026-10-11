"use client";

/**
 * 控制台「系统自检」客户端组件（owner 2026-10-11）
 * ==========================================================================
 * 替换掉仪表盘上**写死**的「未接入自动检测 / 未检测」三处：
 *   · `AdminHealthChips`     —— 页头右侧两个徽标（系统自检 + 授权，点自检徽标=立即检测）
 *   · `AdminHealthCardBadge` —— 「系统状态」卡片右上角（自检正常/异常 + 立即检测按钮）
 *   · `AdminHealthRows`      —— 卡片里的「数据库连接 / 应用服务」两行（真实毫秒 / 运行时长 / 内存）
 *
 * 数据源：`GET /api/admin/system-health`（服务端采集器 `lib/system-health.ts`）。
 * 首屏值由服务端渲染注入（`initial`），所以不会闪一下"未检测"；
 * 进页面 3 秒后复检一次，之后每 60 秒自动复检，也可点「立即检测」。
 *
 * 三个位置**共用同一个模块级 store**：一次请求三方同步更新，不会各拉一次接口。
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Database, Server } from "lucide-react";
import type { SystemHealth } from "@/lib/system-health";

/* ---------------- 模块级共享 store（三个组件 = 一个数据源） ---------------- */

let cache: SystemHealth | null = null;
let inflight: Promise<SystemHealth | null> | null = null;
const subscribers = new Set<(h: SystemHealth) => void>();

function publish(next: SystemHealth) {
  cache = next;
  subscribers.forEach((fn) => fn(next));
}

/** 取一次健康数据（并发调用会复用同一个 in-flight 请求） */
function load(): Promise<SystemHealth | null> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/admin/system-health", { cache: "no-store" });
        if (!res.ok) return null;
        const data = (await res.json()) as SystemHealth;
        publish(data);
        return data;
      } catch {
        // 网络失败：保持上一次结果（不要把一个瞬时抖动渲染成"系统异常"）
        return null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

function useSystemHealth(initial: SystemHealth) {
  const [health, setHealth] = useState<SystemHealth>(cache ?? initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cache) setHealth(cache);
    const onUpdate = (h: SystemHealth) => setHealth(h);
    subscribers.add(onUpdate);
    // SSR 首值可能已过几秒 ⇒ 进页面 3s 后复检一次；此后每 60s 自动复检
    const first = window.setTimeout(() => void load(), 3000);
    const timer = window.setInterval(() => void load(), 60000);
    return () => {
      subscribers.delete(onUpdate);
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    await load();
    setBusy(false);
  }, []);

  return { health, busy, refresh };
}

/* ---------------- 展示辅助 ---------------- */

const fmtUptime = (sec: number): string => {
  if (!sec) return "刚刚启动";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}天${h}小时`;
  if (h) return `${h}小时${m}分`;
  return `${m}分`;
};

const fmtDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("zh-CN") : "永久有效";

/* ---------------- 页头徽标 ---------------- */

export function AdminHealthChips({ initial }: { initial: SystemHealth }) {
  const { health, busy, refresh } = useSystemHealth(initial);
  const lic = health.license;
  const licenceText = !lic.present
    ? "授权：未激活"
    : lic.expired
      ? `授权已过期 · ${fmtDate(lic.expiresAt)}`
      : `授权：${lic.editionLabel || lic.edition} · ${fmtDate(lic.expiresAt)}`;
  const licenceCls = !lic.present
    ? "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
    : lic.expired
      ? "border-red-200 bg-red-50 text-red-600"
      : "border-green-200 bg-green-50 text-green-600";
  const licenceDot = !lic.present ? "bg-gray-300" : lic.expired ? "bg-red-500" : "bg-green-500";

  const detail = [
    `自检时间：${new Date(health.checkedAt).toLocaleString("zh-CN")}`,
    `数据库：${health.database.ok ? `正常 · ${health.database.latencyMs}ms` : `异常 · ${health.database.error || "不可用"}`}`,
    `应用服务：${health.app.ok ? `正常 · Node ${health.app.node} · PID ${health.app.pid}` : "异常"}`,
    `版本：${health.version.current}（${health.version.source === "db" ? "系统版本表" : "package.json"}）`,
    `${licenceText}（点右侧可进「授权管理」）`,
    "点这里立即重新检测",
  ].join("\n");

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        title={detail}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
          health.ok
            ? "border-green-200 bg-green-50 text-green-600 hover:border-green-300"
            : "border-red-200 bg-red-50 text-red-600 hover:border-red-300"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${health.ok ? "animate-pulse bg-green-500" : "bg-red-500"}`} />
        {health.ok ? "系统自检正常" : "系统自检异常"}
        <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
      </button>
      <Link
        href="/admin/license"
        title={`${licenceText}\n点击进入「授权管理」（查看版本 / 到期时间 / 激活授权码）`}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors ${licenceCls}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${licenceDot}`} />
        {licenceText}
      </Link>
    </span>
  );
}

/* ---------------- 「系统状态」卡片右上角 ---------------- */

export function AdminHealthCardBadge({ initial }: { initial: SystemHealth }) {
  const { health, busy, refresh } = useSystemHealth(initial);
  return (
    <span className="flex items-center gap-2">
      <span className={`flex items-center gap-1 text-xs ${health.ok ? "text-green-600" : "text-red-600"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${health.ok ? "animate-pulse bg-green-500" : "bg-red-500"}`} />
        {health.ok ? "自检正常" : "自检异常"}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:opacity-50"
      >
        <RefreshCw size={11} className={busy ? "animate-spin" : ""} /> 立即检测
      </button>
    </span>
  );
}

/* ---------------- 卡片内的「数据库连接 / 应用服务」两行 ---------------- */

export function AdminHealthRows({ initial }: { initial: SystemHealth }) {
  const { health } = useSystemHealth(initial);
  const db = health.database;
  const app = health.app;

  return (
    <>
      <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
        <div className="flex items-center gap-3">
          <Database size={16} className={db.ok ? "text-green-500" : "text-red-500"} />
          <span className="text-[13px] text-gray-700">数据库连接</span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[11px] ${db.ok ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
          title={db.ok ? "PostgreSQL · SELECT 1 往返耗时" : db.error || "数据库不可用"}
        >
          {db.ok ? `正常 · ${db.latencyMs}ms` : "异常"}
        </span>
      </div>
      <div className="flex items-center justify-between rounded px-2 py-2 hover:bg-gray-50/60">
        <div className="flex items-center gap-3">
          <Server size={16} className={app.ok ? "text-green-500" : "text-red-500"} />
          <span className="text-[13px] text-gray-700">应用服务</span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[11px] ${app.ok ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
          title={app.ok ? `Node ${app.node} · PID ${app.pid} · 常驻内存 ${app.rssMb}MB` : "应用服务异常"}
        >
          {app.ok ? `正常 · 运行 ${fmtUptime(app.uptimeSec)} · ${app.rssMb}MB` : "异常"}
        </span>
      </div>
    </>
  );
}
