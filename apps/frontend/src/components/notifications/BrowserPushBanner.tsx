import React, { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle, AlertTriangle, X, RefreshCw } from "lucide-react";
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

    // إذا كانت الصلاحية ممنوحة بالفعل ولكن لم يتم تسجيل الاشتراك في السيرفر بعد، نسجله تلقائياً
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
        setSuccessMessage("✅ تم تفعيل إشعارات المتصفح بنجاح! ستصلك تنبيهات الطلبات والرسائل بصوت عالي حتى لو أغلقت المتصفح.");

        // إرسال إشعار تجريبي فوري ليتأكد المستخدم بنفسه
        try {
          await api.post("/notifications/test", {
            testConfig: {
              channel: "browser",
              type: "order_created",
              title: "🔔 تجربة إشعار المتصفح - منصة ماكس بي",
              message: "مبروك! الإشعارات تعمل الآن في الخلفية حتى عند إغلاق المتصفح.",
              requireInteraction: true,
              forceVisibleNotification: true,
            },
          });
        } catch (_) {}

        setTimeout(() => setSuccessMessage(null), 7000);
      }
    } catch (err: any) {
      console.error("Error activating browser push:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // لا نعرض البار نهائياً إلا لشركة أميرال (ahmedfares61994@gmail.com)، وإذا كان المتصفح غير مدعوم أو تم الإغلاق
  if (!isAmeerelle || dismissed || permission === "unsupported" || !user) {
    return null;
  }

  // إذا تم الاشتراك بنجاح وليس هناك رسالة نجاح حديثة، نخفي البار
  if (isSubscribed && permission === "granted" && !successMessage) {
    return null;
  }

  // رسالة النجاح المؤقتة
  if (successMessage) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-sm animate-fade-in z-50">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-200" />
          <span>{successMessage}</span>
        </div>
        <button
          type="button"
          onClick={() => setSuccessMessage(null)}
          className="p-1 hover:bg-emerald-700 rounded-md transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // إذا كانت الصلاحية مرفوضة في المتصفح (Denied)
  if (permission === "denied") {
    return (
      <div className="bg-amber-700 text-white px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-sm z-50 border-b-2 border-amber-900">
        <div className="flex items-start sm:items-center gap-2.5 font-medium">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-bold">تنبيه هام (الإشعارات محظورة في متصفحك):</span>{" "}
            لتصلك الطلبات والرسائل والمتصفح مغلق، اضغط على علامة القفل 🔒 بجانب رابط الموقع في شريط العنوان بالأعلى، واضبط الإشعارات على <span className="underline font-bold">"سماح" (Allow)</span> ثم أعد تحميل الصفحة.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 bg-white text-amber-900 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة تحميل الصفحة
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-800 rounded-md text-amber-200 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // إذا لم يتم تفعيل الإشعارات بعد (Permission: default)
  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-sm z-50 animate-fade-in border-b border-orange-700">
      <div className="flex items-center gap-2.5 font-medium">
        <BellRing className="h-5 w-5 shrink-0 text-amber-200 animate-bounce" />
        <span>
          <strong className="font-bold">تنبيه لشركة أميرال:</strong> لتصلك إشعارات الطلبات والرسائل الجديدة بصوت عالي حتى عندما يكون المتصفح مغلقاً، يرجى تفعيل إشعارات المتصفح الآن.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleActivate}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 bg-white text-orange-700 hover:bg-orange-50 font-bold px-4 py-1.5 rounded-lg text-xs shadow-md transition disabled:opacity-60"
        >
          <Bell className="h-3.5 w-3.5" />
          {isLoading ? "جاري التفعيل..." : "🔔 تفعيل الإشعارات الآن"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-orange-800 rounded-md text-orange-200 hover:text-white transition"
          title="إغلاق التنبيه مؤقتاً"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BrowserPushBanner;
