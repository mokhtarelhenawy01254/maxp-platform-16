import React, { useState, useEffect } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/80 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${className}`}
      title="تحديث جديد متاح للمنصة — اضغط لتطبيق التحديث والتحميل الفوري"
      aria-label="تحديث المنصة إلى آخر إصدار"
    >
      <ArrowPathIcon className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">تحديث متاح</span>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    </button>
  );
};

export default AppUpdateIndicator;
