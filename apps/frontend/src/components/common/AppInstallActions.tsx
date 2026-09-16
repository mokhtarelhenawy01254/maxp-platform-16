import React, { useState, useEffect } from "react";
import { Smartphone, Apple } from "lucide-react";
import { isCapacitorNative } from "../../config/environment";
import { IosInstallModal } from "./IosInstallModal";

interface AppInstallActionsProps {
  layout?: "stacked" | "inline" | "sidebar";
  className?: string;
  isCollapsed?: boolean;
}

export const AppInstallActions: React.FC<AppInstallActionsProps> = ({
  layout = "inline",
  className = "",
  isCollapsed = false,
}) => {
  const [showIosModal, setShowIosModal] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator) return;

    const ua = navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);

    setIsStandalone(standalone);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("other");
  }, []);

  // Do not render inside installed standalone PWA or native Capacitor wrapper
  if (isCapacitorNative() || isStandalone) {
    return null;
  }

  const renderIosButton = (fullWidth = false) => (
    <button
      type="button"
      onClick={() => setShowIosModal(true)}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-[0.97] transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs group ${
        fullWidth ? "w-full" : ""
      }`}
      title="تثبيت التطبيق على هواتف الآيفون (iOS)"
    >
      <Apple className="w-4 h-4 text-slate-800 dark:text-white shrink-0 group-hover:scale-110 transition-transform" />
      <span>تثبيت للآيفون (iOS)</span>
    </button>
  );

  const renderAndroidButton = (fullWidth = false) => (
    <a
      href="/download/maxp.apk"
      download="MaxP.apk"
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-[0.97] transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs group ${
        fullWidth ? "w-full" : ""
      }`}
      title="تحميل مباشر لتطبيق الأندرويد بصيغة APK"
    >
      <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
      <span>تحميل للأندرويد (APK)</span>
    </a>
  );

  if (layout === "sidebar") {
    return (
      <>
        <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20 space-y-1.5">
          {platform === "ios" ? (
            <button
              type="button"
              onClick={() => setShowIosModal(true)}
              className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all w-full text-start ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="تثبيت تطبيق الآيفون (iOS)"
            >
              <span className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">
                <Apple className="h-4 w-4" />
              </span>
              {!isCollapsed && (
                <div className="flex flex-col text-start overflow-hidden">
                  <span className="font-semibold text-gray-900 dark:text-white leading-tight truncate">تطبيق الآيفون</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">تثبيت سريع (iOS)</span>
                </div>
              )}
            </button>
          ) : platform === "android" ? (
            <a
              href="/download/maxp.apk"
              download="MaxP.apk"
              className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="تحميل تطبيق الأندرويد (APK)"
            >
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Smartphone className="h-4 w-4" />
              </span>
              {!isCollapsed && (
                <div className="flex flex-col text-start overflow-hidden">
                  <span className="font-semibold text-gray-900 dark:text-white leading-tight truncate">تطبيق الأندرويد</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">تحميل مباشر (APK)</span>
                </div>
              )}
            </a>
          ) : (
            <>
              <a
                href="/download/maxp.apk"
                download="MaxP.apk"
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title="تحميل تطبيق الأندرويد (APK)"
              >
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Smartphone className="h-4 w-4" />
                </span>
                {!isCollapsed && (
                  <div className="flex flex-col text-start overflow-hidden">
                    <span className="font-semibold text-gray-900 dark:text-white leading-tight truncate">تطبيق الأندرويد</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">تحميل مباشر (APK)</span>
                  </div>
                )}
              </a>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => setShowIosModal(true)}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all w-full text-start"
                  title="تثبيت تطبيق الآيفون (iOS)"
                >
                  <span className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">
                    <Apple className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col text-start overflow-hidden">
                    <span className="font-semibold text-gray-900 dark:text-white leading-tight truncate">تطبيق الآيفون</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">تثبيت سريع (iOS)</span>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
        <IosInstallModal isOpen={showIosModal} onClose={() => setShowIosModal(false)} />
      </>
    );
  }

  return (
    <>
      <div className={`mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800/70 text-center ${className}`}>
        {platform === "ios" ? (
          renderIosButton(true)
        ) : platform === "android" ? (
          renderAndroidButton(true)
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {renderAndroidButton(true)}
            {renderIosButton(true)}
          </div>
        )}
      </div>
      <IosInstallModal isOpen={showIosModal} onClose={() => setShowIosModal(false)} />
    </>
  );
};
