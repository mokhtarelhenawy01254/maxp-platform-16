import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import {
  getCurrentPortalPushSubscription,
  getPortalNotificationPermission,
  getPortalPushBearerToken,
  isPortalPushSupported,
  subscribePortalPush,
  unsubscribePortalPush,
  type PortalPushRole,
} from "../../services/portalPushService";

export interface PortalPushToggleProps {
  portal: PortalPushRole;
  accentColor?: string;
  className?: string;
}

function isIosDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const PortalPushToggle: React.FC<PortalPushToggleProps> = ({
  portal,
  accentColor,
  className,
}) => {
  const supported = isPortalPushSupported();
  const hasToken = Boolean(getPortalPushBearerToken(portal));

  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => getPortalNotificationPermission());
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(supported && hasToken);
  const [busy, setBusy] = useState<boolean>(false);

  const syncPushState = useCallback(async () => {
    if (!isPortalPushSupported() || !getPortalPushBearerToken(portal)) {
      setSubscribed(false);
      setChecking(false);
      return;
    }
    setPermission(getPortalNotificationPermission());
    try {
      const existing = await getCurrentPortalPushSubscription();
      setSubscribed(Boolean(existing));
    } catch {
      setSubscribed(false);
    } finally {
      setChecking(false);
    }
  }, [portal]);

  useEffect(() => {
    let active = true;
    const runSync = () => {
      if (active) void syncPushState();
    };
    runSync();

    if (typeof window === "undefined" || typeof document === "undefined") {
      return () => {
        active = false;
      };
    }

    const onVisibility = () => {
      if (document.visibilityState !== "hidden") runSync();
    };
    window.addEventListener("focus", runSync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", runSync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncPushState]);

  if (!supported) {
    if (hasToken && isIosDevice()) {
      return (
        <button
          type="button"
          onClick={() =>
            toast.info(
              "على أجهزة آيفون (iOS): أضف الصفحة للشاشة الرئيسية (Add to Home Screen) من زر المشاركة في سفاري لتفعيل الإشعارات الفورية.",
              { duration: 6000 },
            )
          }
          title="لتفعيل الإشعارات على iOS، أضف الصفحة للشاشة الرئيسية"
          aria-label="تعليمات تفعيل الإشعارات على آيفون"
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] sm:min-w-0 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 active:scale-[0.97]",
            className,
          )}
        >
          <Bell className="size-4 shrink-0 opacity-70" aria-hidden="true" />
          <span className="hidden sm:inline">إشعارات iOS</span>
        </button>
      );
    }
    return null;
  }

  if (!hasToken) return null;

  const isDenied = permission === "denied";
  const isActive = subscribed && permission === "granted";

  const handleClick = async () => {
    if (busy || checking) return;
    if (isDenied) {
      toast.info("تم حظر الإشعارات من المتصفح، يرجى تفعيلها من إعدادات الموقع");
      return;
    }

    setBusy(true);
    try {
      if (isActive) {
        await unsubscribePortalPush(portal);
        setSubscribed(false);
        toast.success("تم إيقاف الإشعارات الفورية");
      } else {
        await subscribePortalPush(portal);
        setSubscribed(true);
        toast.success("تم تفعيل الإشعارات الفورية بنجاح");
      }
      setPermission(getPortalNotificationPermission());
    } catch (error) {
      setPermission(getPortalNotificationPermission());
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "تعذر تحديث حالة الإشعارات",
      );
    } finally {
      setBusy(false);
    }
  };

  const label = isDenied
    ? "الإشعارات محظورة"
    : isActive
      ? "الإشعارات مفعلة"
      : "تفعيل الإشعارات";
  const title = isDenied
    ? "تم حظر الإشعارات — فعّلها من إعدادات المتصفح"
    : isActive
      ? "إيقاف الإشعارات الفورية"
      : "تفعيل الإشعارات الفورية";
  const cleanAccent = accentColor?.trim();
  const inactiveStyle =
    !isActive && !isDenied && cleanAccent
      ? {
          borderColor: `${cleanAccent}45`,
          color: cleanAccent,
          backgroundColor: `${cleanAccent}0D`,
        }
      : undefined;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || checking}
      aria-label={label}
      aria-pressed={isActive}
      title={title}
      style={inactiveStyle}
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] sm:min-w-0 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : isDenied
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/70 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
            : "border-border/80 bg-background text-foreground hover:bg-muted/50",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : isDenied ? (
        <BellOff className="size-4 shrink-0" aria-hidden="true" />
      ) : isActive ? (
        <BellRing className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Bell className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

export default PortalPushToggle;
