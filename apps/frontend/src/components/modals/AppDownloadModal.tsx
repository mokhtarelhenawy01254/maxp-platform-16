import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl?: string;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  downloadUrl = "/downloads/maxp-app.apk",
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setFullUrl(downloadUrl.startsWith("http") ? downloadUrl : `${origin}${downloadUrl}`);
    }
  }, [downloadUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  // Generate SVG QR Code URL using free reliable API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    fullUrl || "https://maxp.online/downloads/maxp-app.apk"
  )}&color=6b21a8&bgcolor=ffffff&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 animate-scale-up">
        {/* Header decoration bar */}
        <div className="h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          aria-label="إغلاق النافذة"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          {/* Logo & Title */}
          <div className="flex justify-center mb-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/50 shadow-inner">
              <img
                src="/logo.png"
                alt="MAX-P"
                className="h-12 w-auto object-contain rounded-xl"
              />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
            تحميل تطبيق MAX-P للموبايل 📱
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            احصل على تجربة سريعة ومتكاملة لإدارة أعمالك مباشرة من هاتف الأندرويد
          </p>

          {/* QR Code Container (Desktop View Highlight) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 mb-5 inline-block w-full">
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 mb-2">
              <QrCodeIcon className="w-4 h-4" />
              <span>امسح الكود بكاميرا الموبايل للتحميل المباشر</span>
            </div>

            <div className="flex justify-center my-2">
              <div className="p-2 bg-white rounded-xl shadow-md border border-slate-100">
                <img
                  src={qrApiUrl}
                  alt="Scan QR Code to Download MAX-P APK"
                  className="w-44 h-44 object-contain rounded-lg"
                  loading="eager"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>ملف APK آمن وسريع • الإصدار الرسمي v4.2</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href={downloadUrl}
              download="maxp-app.apk"
              className="w-full min-h-[48px] px-5 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-sm rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <ArrowDownTrayIcon className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>تحميل ملف APK المباشر</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="w-full min-h-[44px] px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              {copied ? (
                <>
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم نسخ رابط التحميل!</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-4 h-4" />
                  <span>نسخ رابط التحميل لشخص آخر</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadModal;
