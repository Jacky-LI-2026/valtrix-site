"use client"

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Link2, Check, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

/**
 * 分享弹窗：二维码（微信/朋友圈扫码）+ 复制链接 + 系统原生分享（移动端 Web Share API）。
 */
export default function ShareModal({ open, onClose, url, title }: ShareModalProps) {
  const { t } = useI18n();
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setQr("");
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: "#111827", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, url]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // 剪贴板不可用时提示手动复制
    }
  };

  const webShare = async () => {
    if (typeof (navigator as any).share === "function") {
      try {
        await (navigator as any).share({ title, url });
      } catch (e) {
        // 用户取消
      }
    } else {
      copyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t("close")}
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-dark mb-1">{t("shareTitle")}</h3>
        <p className="text-sm text-dark-400 mb-4">{t("scanToShare")}</p>
        <div className="flex justify-center mb-4 bg-white border border-dark-100 rounded-lg p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR" className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-sm">
              {t("loading")}
            </div>
          )}
        </div>
        <p className="text-xs text-dark-400 text-center break-all mb-4">{url}</p>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-dark-200 rounded-lg text-sm text-dark-700 hover:bg-dark-50 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
            {copied ? t("copied") : t("copyLink")}
          </button>
          {typeof (navigator as any).share === "function" && (
            <button
              onClick={webShare}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              <Share2 size={16} />
              {t("shareNow")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
