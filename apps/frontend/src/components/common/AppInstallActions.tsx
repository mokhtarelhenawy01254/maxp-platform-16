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

  if (isCapacitorNative() || isStandalone) {
    return null;
  }

  const renderIosButton = (fullWidth = false) => (
    <button
      type="button"
      onClick={() => setShowIosModal(true)}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted/70 transition-colors border border-border/70 shadow-xs group ${
        fullWidth ? "w-full" : ""
      }`}
      title="تثبيت التطبيق على هواتف الآيفون (iOS)"
    >
      <Apple className="size-4 text-foreground shrink-0 group-hover:scale-105 transition-transform" />
      <span>تثبيت للآيفون (iOS)</span>
    </button>
  );

  const renderAndroidButton = (fullWidth = false) => (
    <a
      href="/download/maxp.apk"
      download="MaxP.apk"
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted/70 transition-colors border border-border/70 shadow-xs group ${
        fullWidth ? "w-full" : ""
      }`}
      title="تحميل مباشر لتطبيق الأندرويد بصيغة APK"
    >
      <Smartphone className="size-4 text-emerald-500 shrink-0 group-hover:scale-105 transition-transform" />
      <span>تحميل للأندرويد (APK)</span>
    </a>
  );

  if (layout === "sidebar") {
    return (
      <>
        <div className="p-2 border-t border-border/60 bg-muted/20 space-y-1.5">
          {platform === "ios" ? (
            <button
              type="button"
              onClick={() => setShowIosModal(true)}
              className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-card border border-transparent hover:border-border/60 transition-colors w-full text-start ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="تثبيت تطبيق الآيفون (iOS)"
            >
              <span className="p-1.5 rounded-md bg-foreground text-background shrink-0">
                <Apple className="size-3.5" />
              </span>
              {!isCollapsed && (
                <div className="flex flex-col text-start overflow-hidden">
                  <span className="font-semibold text-foreground leading-tight truncate">تطبيق الآيفون</span>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">تثبيت سريع (iOS)</span>
                </div>
              )}
            </button>
          ) : platform === "android" ? (
            <a
              href="/download/maxp.apk"
              download="MaxP.apk"
              className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-card border border-transparent hover:border-border/60 transition-colors ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="تحميل تطبيق الأندرويد (APK)"
            >
              <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
                <Smartphone className="size-3.5" />
              </span>
              {!isCollapsed && (
                <div className="flex flex-col text-start overflow-hidden">
                  <span className="font-semibold text-foreground leading-tight truncate">تطبيق الأندرويد</span>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">تحميل مباشر (APK)</span>
                </div>
              )}
            </a>
          ) : (
            <>
              <a
                href="/download/maxp.apk"
                download="MaxP.apk"
                className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-card border border-transparent hover:border-border/60 transition-colors ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title="تحميل تطبيق الأندرويد (APK)"
              >
                <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
                  <Smartphone className="size-3.5" />
                </span>
                {!isCollapsed && (
                  <div className="flex flex-col text-start overflow-hidden">
                    <span className="font-semibold text-foreground leading-tight truncate">تطبيق الأندرويد</span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">تحميل مباشر (APK)</span>
                  </div>
                )}
              </a>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => setShowIosModal(true)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-foreground hover:bg-card border border-transparent hover:border-border/60 transition-colors w-full text-start"
                  title="تثبيت تطبيق الآيفون (iOS)"
                >
                  <span className="p-1.5 rounded-md bg-foreground text-background shrink-0">
                    <Apple className="size-3.5" />
                  </span>
                  <div className="flex flex-col text-start overflow-hidden">
                    <span className="font-semibold text-foreground leading-tight truncate">تطبيق الآيفون</span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">تثبيت سريع (iOS)</span>
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
      <div className={`mt-6 pt-4 border-t border-border/60 text-center ${className}`}>
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

export default AppInstallActions;
