import React, { useState, useEffect } from "react";
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

interface SmartAppBannerProps {
  onOpenModal: () => void;
  downloadUrl?: string;
}

export const SmartAppBanner: React.FC<SmartAppBannerProps> = ({
  onOpenModal,
  downloadUrl = "/downloads/maxp-app.apk",
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("maxp_dismiss_app_banner") === "true";
      setDismissed(isDismissed);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("maxp_dismiss_app_banner", "true");
    }
  };

  if (dismissed) return null;

  return (
    <div className="md:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md flex items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 p-1.5 bg-purple-600/30 rounded-xl border border-purple-500/30">
            <img src="/logo.png" alt="MAX-P" className="w-9 h-9 object-contain rounded-lg" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-xs font-black truncate text-white">تطبيق MAX-P للموبايل</h4>
              <span className="bg-purple-500/30 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold">APK</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">احصل على سرعة وتنبيهات فورية لمبيعاتك</p>
          </div>
        </div>

        {/* Action & Close */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={downloadUrl}
            download="maxp-app.apk"
            onClick={onOpenModal}
            className="min-h-[40px] px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>تحميل</span>
          </a>

          <button
            onClick={handleDismiss}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="إغلاق الإشعار"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartAppBanner;
