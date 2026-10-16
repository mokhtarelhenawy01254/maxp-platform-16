import React, { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle2, AlertTriangle, X, RefreshCw, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  isBrowserPushSupported,
  subscribeToBrowserPush,
  readBrowserPushState,
} from "../../utils/pushNotifications";
import api from "../../services/api";

export const BrowserPushBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const isAmeerelle = Boolean(
    isAuthenticated &&
      user &&
      (user.companyId === "cmteva12p00lrjuwxpufr4k8w" ||
        user.company?.id === "cmteva12p00lrjuwxpufr4k8w" ||
        user.email?.trim().toLowerCase() === "ahmedfares61994@gmail.com" ||
        (user as any)?.companyEmail?.trim().toLowerCase() === "ahmedfares61994@gmail.com" ||
        (user as any)?.company?.email?.trim().toLowerCase() === "ahmedfares61994@gmail.com" ||
        user.companies?.some((c) => c.id === "cmteva12p00lrjuwxpufr4k8w"))
  );

  const checkStatus = () => {
    if (typeof window === "undefined" || !isBrowserPushSupported()) {
      setPermission("unsupported");
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    const pushState = readBrowserPushState();
    setIsSubscribed(Boolean(pushState?.active));

    if (currentPerm === "granted" && !pushState?.active && isAmeerelle) {
      subscribeToBrowserPush()
        .then(() => setIsSubscribed(true))
        .catch((err) => console.warn("Auto-subscribe on mount error:", err));
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user || !isAmeerelle) return;
    checkStatus();

    const handleUpdate = () => checkStatus();
    window.addEventListener("browser-push:updated", handleUpdate);
    return () => {
      window.removeEventListener("browser-push:updated", handleUpdate);
    };
  }, [isAuthenticated, user, isAmeerelle]);

  const handleActivate = async () => {
    try {
      setIsLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        await subscribeToBrowserPush();
        setIsSubscribed(true);
        setSuccessMessage("تم تفعيل إشعارات المتصفح بنجاح، ستصلك تنبيهات الطلبات والرسائل حتى لو أغلقت المتصفح.");

        try {
          await api.post("/notifications/test", {
            testConfig: {
              channel: "browser",
              type: "order_created",
              title: "تجربة إشعار المتصفح - منصة ماكس بي",
              message: "الإشعارات تعمل الآن في الخلفية حتى عند إغلاق نافذة المتصفح.",
              requireInteraction: true,
              forceVisibleNotification: true,
            },
          });
        } catch {
          // silent fail
        }

        setTimeout(() => setSuccessMessage(null), 7000);
      }
    } catch (err: any) {
      console.error("Error activating browser push:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAmeerelle || dismissed || permission === "unsupported" || !user) {
    return null;
  }

  if (isSubscribed && permission === "granted" && !successMessage) {
    return null;
  }

  if (successMessage) {
    return (
      <div className="z-50 flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-800 shadow-none dark:text-emerald-300">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
        <button
          type="button"
          onClick={() => setSuccessMessage(null)}
          className="rounded-lg p-1 text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
          aria-label="إغلاق"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-foreground shadow-none">
        <div className="flex items-start gap-2.5 font-medium sm:items-center">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500 sm:mt-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-600 dark:text-amber-400">تنبيه صلاحيات الإشعارات:</span>{" "}
            لتصلك الطلبات والرسائل والمتصفح مغلق، اضغط على علامة القفل <Lock className="-mt-0.5 inline-block size-3" /> بجانب رابط الموقع في شريط العنوان بالأعلى، واضبط الإشعارات على <span className="font-semibold underline">"سماح" (Allow)</span> ثم أعد تحميل الصفحة.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/50"
          >
            <RefreshCw className="size-3" />
            إعادة تحميل الصفحة
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="z-50 flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-xs text-foreground shadow-none">
      <div className="flex items-center gap-2.5 font-medium">
        <BellRing className="size-4 shrink-0 text-primary" />
        <span>
          <strong className="font-semibold text-primary">تنبيه الإشعارات:</strong> لتصلك تنبيهات الطلبات والرسائل الجديدة بصوت عالي حتى عندما يكون المتصفح مغلقاً، يرجى تفعيل إشعارات المتصفح.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleActivate}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              جاري التفعيل...
            </>
          ) : (
            <>
              <Bell className="size-3" />
              تفعيل الإشعارات الآن
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="إغلاق التنبيه مؤقتاً"
          aria-label="إغلاق التنبيه"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

export default BrowserPushBanner;
