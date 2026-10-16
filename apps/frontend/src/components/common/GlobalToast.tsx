import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastEventDetail {
  message: string;
  type: "success" | "error" | "info";
}

const GlobalToast: React.FC = () => {
  const [toast, setToast] = useState<ToastEventDetail | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    let clearTimer: NodeJS.Timeout;

    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEventDetail>;
      setToast(customEvent.detail);
      setIsVisible(true);

      clearTimeout(hideTimer);
      clearTimeout(clearTimer);

      // Auto hide after 3 seconds
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        clearTimer = setTimeout(() => setToast(null), 250);
      }, 3000);
    };

    window.addEventListener("show-toast", handleToast);
    return () => {
      window.removeEventListener("show-toast", handleToast);
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, []);

  if (!toast) return null;

  const typeConfig = {
    success: {
      border: "border-emerald-500/30",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    error: {
      border: "border-destructive/30",
      icon: <AlertCircle className="w-4 h-4 text-destructive shrink-0" />,
      badge: "bg-destructive/10 text-destructive",
    },
    info: {
      border: "border-primary/30",
      icon: <Info className="w-4 h-4 text-primary shrink-0" />,
      badge: "bg-primary/10 text-primary",
    },
  }[toast.type] || {
    border: "border-border/70",
    icon: <Info className="w-4 h-4 text-primary shrink-0" />,
    badge: "bg-muted text-foreground",
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-200 pointer-events-auto ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-card/98 backdrop-blur-md shadow-xl ${typeConfig.border} min-w-[300px] max-w-md`}
      >
        <div className="shrink-0">{typeConfig.icon}</div>
        <p className="flex-1 text-xs font-semibold text-foreground leading-normal select-none">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors active:scale-95 cursor-pointer"
          aria-label="إغلاق الإشعار"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default GlobalToast;
