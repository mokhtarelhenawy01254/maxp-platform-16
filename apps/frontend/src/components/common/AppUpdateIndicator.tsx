import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { flushSWCacheAndReload } from "../../utils/swCacheFlush";

declare global {
  interface Window {
    __MAXP_UPDATE_AVAILABLE__?: boolean;
  }
}

export const AppUpdateIndicator: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(() => {
    return typeof window !== "undefined" && Boolean(window.__MAXP_UPDATE_AVAILABLE__);
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
    };

    if (typeof window !== "undefined") {
      if (window.__MAXP_UPDATE_AVAILABLE__) {
        setHasUpdate(true);
      }
      window.addEventListener("maxp:update-available", handleUpdateAvailable);
      window.addEventListener("sw-update-ready", handleUpdateAvailable);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("maxp:update-available", handleUpdateAvailable);
        window.removeEventListener("sw-update-ready", handleUpdateAvailable);
      }
    };
  }, []);

  if (!hasUpdate) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    void flushSWCacheAndReload();
  };

  return (
    <button
      type="button"
      onClick={handleUpdate}
      disabled={isUpdating}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-full transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:opacity-60 ${className}`}
      title="تحديث جديد متاح للمنصة — اضغط لتطبيق التحديث والتحميل الفوري"
      aria-label="تحديث المنصة إلى آخر إصدار"
    >
      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isUpdating ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">تحديث متاح</span>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    </button>
  );
};

export default AppUpdateIndicator;
