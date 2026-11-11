import React, { useEffect, useMemo, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { resolveBrandingLogoUrl } from "../../hooks/useCompanyBranding";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export interface PortalInstallBannerProps {
  portal: string;
  companyId?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  accentColor?: string;
  className?: string;
}

const getDismissKey = (companyId: string | null | undefined, portal: string): string =>
  `maxp_portal_install_dismissed:${companyId?.trim() || "apex"}:${portal?.trim() || "portal"}`;

const isStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const matches = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(matches || nav.standalone === true);
};

const isIosNonStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator?.userAgent || "";
  const win = window as Window & { MSStream?: unknown };
  return /iPad|iPhone|iPod/i.test(ua) && !win.MSStream && !isStandaloneMode();
};

const readDismissed = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

export const PortalInstallBanner: React.FC<PortalInstallBannerProps> = ({
  portal,
  companyId,
  companyName,
  companyLogo,
  accentColor,
  className,
}) => {
  const dismissKey = useMemo(() => getDismissKey(companyId, portal), [companyId, portal]);
  const [standalone, setStandalone] = useState<boolean>(() => isStandaloneMode());
  const [iosDevice, setIosDevice] = useState<boolean>(() => isIosNonStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(dismissKey));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed(dismissKey));
  }, [dismissKey]);

  useEffect(() => {
    setLogoError(false);
  }, [companyLogo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStandalone(isStandaloneMode());
    setIosDevice(isIosNonStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissed || (!deferredPrompt && !iosDevice)) return null;

  const brandName = companyName?.trim() || "البوابة";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(companyLogo) : null;
  const accent = accentColor?.trim() || "#4f46e5";

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // Ignore storage quota errors
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt || installing) return;
    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") setStandalone(true);
      setDeferredPrompt(null);
    } catch {
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      dir="rtl"
      role="region"
      aria-label={`تثبيت تطبيق ${brandName}`}
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-2xs",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {resolvedLogo ? (
          <img
            src={resolvedLogo}
            alt={brandName}
            onError={() => setLogoError(true)}
            className="size-9 shrink-0 rounded-lg border border-border/60 bg-background object-cover"
          />
        ) : (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {brandName.charAt(0) || <Smartphone className="size-4" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
            تثبيت تطبيق {brandName}
          </p>
          {deferredPrompt ? (
            <p className="truncate text-[11px] text-muted-foreground">
              وصول أسرع من الشاشة الرئيسية وتنبيهات فورية
            </p>
          ) : (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Share className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                اضغط على مشاركة ثم اختيار إضافة إلى الشاشة الرئيسية
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {deferredPrompt ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installing}
            style={{ backgroundColor: accent }}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-60"
          >
            <Download className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{installing ? "جاري التثبيت…" : "تثبيت التطبيق"}</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="إخفاء"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default PortalInstallBanner;
