"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import DownloadGateModal from "./DownloadGateModal";
import { getDownloadProfile } from "@/lib/download-gate";
import { useI18n } from "@/lib/i18n";

interface DownloadGateButtonProps {
  href: string;
  resourceName: string;
  /** 是否在新标签页打开（产品手册场景使用） */
  openInNewTab?: boolean;
  /** 强制禁用；不传时自动根据 href 判断（# 或空视为无链接文件） */
  disabled?: boolean;
  /** 下载上报：验证通过并触发下载时调用 /api/public/download-track
   *  - { type: "resource", id }：资源下载计数 +1
   *  - { type: "manual" }：产品手册下载计数 +1
   *  不传则不上报（如某些占位场景） */
  track?: { type: "resource" | "manual"; id?: number };
  /** 审核模式：验证通过后不立即下载，而是创建"待审核"留资，
   *  后台确认通过（approved）后同一邮箱再次点击才开放下载。
   *  approvalResource 用于唯一标识资源，如 { type: "solution", key: "jewelry" } */
  requireApproval?: boolean;
  approvalResource?: { type: string; key: string };
  className?: string;
  children: ReactNode;
}

/**
 * 下载门禁按钮：
 * - 无链接文件（href 为 # 或空）→ 灰色禁用态显示，不可点击、不弹验证
 * - 普通模式：已验证（localStorage 有效期内）→ 直接下载；未验证 → 验证弹窗 → 验证通过后自动下载
 * - 审核模式（requireApproval）：验证通过 → 提交"待审核"留资（不立即下载）；
 *   后台确认通过后，同一邮箱再次点击 → 自动放行下载；待审核/已拒绝 → 提示不下载
 */
export default function DownloadGateButton({
  href,
  resourceName,
  openInNewTab = false,
  disabled,
  track,
  requireApproval = false,
  approvalResource,
  className,
  children,
}: DownloadGateButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 无链接文件（href 为 # 或空）视为禁用态：灰色显示、不可点击
  const isDisabled = disabled ?? (!href || href === "#");

  function showToast(text: string, type: "info" | "error" = "info") {
    setMessage({ text, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(null), 4000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // 下载上报（fire-and-forget，失败不影响下载）
  function trackDownload() {
    if (!track) return;
    try {
      fetch("/api/public/download-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track),
      }).catch(() => {});
    } catch {
      // 忽略上报错误
    }
  }

  function performDownload() {
    if (!href || href === "#") return; // 占位链接（资料尚未上传）不触发下载
    trackDownload();
    if (openInNewTab) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = href;
      a.download = "";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  /** 审核模式：创建待审核留资（后台确认后开放下载） */
  async function submitLeadApplication() {
    const profile = getDownloadProfile();
    if (!profile) return;
    try {
      const res = await fetch("/api/public/download-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          name: profile.name,
          company: profile.company,
          phone: profile.phone,
          resourceType: approvalResource?.type || "resource",
          resourceKey: approvalResource?.key || resourceName,
          resourceName,
          downloadUrl: href,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(t("downloadApplySubmit"));
      } else {
        showToast(data.message || t("downloadErrorNetwork"), "error");
      }
    } catch {
      showToast(t("downloadErrorNetwork"), "error");
    }
  }

  /** 审核模式：查询当前邮箱的审核状态 */
  async function checkApprovalStatus(): Promise<"approved" | "pending" | "rejected" | "none"> {
    const profile = getDownloadProfile();
    if (!profile) return "none";
    const params = new URLSearchParams({
      email: profile.email,
      resourceType: approvalResource?.type || "resource",
      resourceKey: approvalResource?.key || resourceName,
    });
    const res = await fetch(`/api/public/download-gate/status?${params.toString()}`);
    const data = await res.json();
    return data.status || "none";
  }

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (isDisabled || checking) return;

    if (!requireApproval) {
      if (getDownloadProfile()) {
        performDownload();
      } else {
        setOpen(true);
      }
      return;
    }

    // 审核模式
    if (!getDownloadProfile()) {
      setOpen(true);
      return;
    }
    setChecking(true);
    try {
      const status = await checkApprovalStatus();
      if (status === "approved") {
        showToast(t("downloadApproved"));
        setTimeout(() => performDownload(), 300);
      } else if (status === "pending") {
        showToast(t("downloadPending"));
      } else if (status === "rejected") {
        showToast(t("downloadRejected"), "error");
      } else {
        // 无记录（历史即时验证或未申请）→ 重新走申请流程
        setOpen(true);
      }
    } catch {
      // 查询失败：回退为走验证/申请流程
      setOpen(true);
    } finally {
      setChecking(false);
    }
  }

  // 禁用态：用 !important 覆盖传入的主色样式为灰色
  const disabledClass = isDisabled
    ? "!bg-dark-200 hover:!bg-dark-200 !text-dark-400 hover:!text-dark-400 cursor-not-allowed group-hover:!shadow-none"
    : "";

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        aria-disabled={isDisabled}
        className={`${className} ${disabledClass}`.trim()}
      >
        {checking ? <span>{t("downloadChecking")}</span> : children}
      </a>
      {!isDisabled && (
        <DownloadGateModal
          open={open}
          resourceName={resourceName}
          downloadUrl={href}
          requireApproval={requireApproval}
          onClose={() => setOpen(false)}
          onVerified={() => {
            setOpen(false);
            if (requireApproval) {
              submitLeadApplication();
            } else {
              performDownload();
            }
          }}
        />
      )}
      {message && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-lg shadow-xl text-sm font-medium text-white ${
            message.type === "error" ? "bg-red-600" : "bg-dark-900"
          }`}
        >
          {message.text}
        </div>
      )}
    </>
  );
}
