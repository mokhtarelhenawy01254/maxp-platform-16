import React, { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, CreditCard, ArrowLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import AccessDenied from "./AccessDenied";
import { APP_REGISTRY } from "../../config/appRegistry";

export const APP_SLUG_ALIASES: Record<string, string[]> = {
  "whatsapp-business": [
    "whatsapp-integration",
    "whatsapp-inbox",
    "whatsapp-settings",
    "whatsapp-notifications",
    "whatsapp-templates",
    "whatsapp-routing",
    "unified-inbox",
  ],
  "whatsapp-cloud-api": ["whatsapp-business", "whatsapp-integration", "unified-inbox"],
  "whatsapp-integration": ["whatsapp-business", "whatsapp-inbox", "unified-inbox"],
  "telegram-business": ["telegram-integration", "telegram"],
  "telegram-integration": ["telegram-business", "telegram"],
  "crm-lite": ["crm-basic", "crm"],
  "crm-basic": ["crm-lite", "crm"],
  "unified-inbox": [
    "whatsapp-business",
    "whatsapp-integration",
    "whatsapp-inbox",
    "facebook-pages-connect",
    "instagram-business",
    "tiktok-integrations",
    "telegram-business",
    "telegram-integration",
    "crm-lite",
    "crm-basic",
  ],
  "orders-analytics": ["analytics-basic", "analytics-advanced", "analytics"],
  "analytics-basic": ["orders-analytics", "analytics-advanced", "analytics"],
  "hr-core": ["hr-basic", "hr-pro", "hr-attendance-pro", "hr-payroll", "hr-assets", "hr-recruitment"],
  "hr-basic": ["hr-core", "hr-pro", "hr-attendance-pro", "hr-payroll", "hr-assets", "hr-recruitment"],
  "dental-lab-app": ["dental-lab"],
  "dental-lab": ["dental-lab-app"],
  "booking-app": ["service-request-app", "service-requests", "medical-system", "booking-appointments"],
  "order-shipping-turbo": [
    "order-shipping-hub",
    "order-shipping",
    "order-shipping-bosta",
    "order-shipping-qpexpress",
  ],
  "pos-pro": ["cafe-restaurant-pro", "store-pro", "ecommerce-pro"],
};

function getCandidateSlugs(slug: string): string[] {
  const normalized = slug.trim().toLowerCase();
  const aliases = APP_SLUG_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases]));
}

interface AppAccessRouteProps {
  children: ReactNode;
  requiredAppSlugs: string[];
  redirectMode?: "redirect" | "screen" | "overlay-blur";
}

/**
 * Protects a route based on whether the company has one of the required
 * marketplace apps active.
 * If subscription is missing or expired, redirects to the marketplace subscription/renewal page
 * or renders a blurred locked overlay with renewal popup.
 * SUPER_ADMIN always bypasses.
 */
export const AppAccessRoute: React.FC<AppAccessRouteProps> = ({
  children,
  requiredAppSlugs,
  redirectMode = "redirect",
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Super admin bypass
  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  const currentCompany = user?.companies?.find((c) => c.isCurrent) || user?.company;
  const activeApps = Array.isArray(currentCompany?.activeApps)
    ? currentCompany.activeApps
    : Array.isArray(user?.company?.activeApps)
      ? user.company.activeApps
      : Array.isArray(user?.activeApps)
        ? user.activeApps
        : [];

  const hasAccess = requiredAppSlugs.some((requiredSlug) => {
    const candidates = getCandidateSlugs(requiredSlug);
    return activeApps.some((a) => {
      const slugVal = typeof a === "string" ? a : (a as { slug?: string; app?: { slug?: string } })?.slug || (a as { app?: { slug?: string } })?.app?.slug;
      if (!slugVal || typeof slugVal !== "string") return false;
      const lower = slugVal.trim().toLowerCase();
      return candidates.includes(lower);
    });
  });

  const primarySlug = requiredAppSlugs[0]?.trim() || "marketplace";

  const formattedAppNames = React.useMemo(() => {
    if (requiredAppSlugs.some((s) => s.toLowerCase().startsWith("whatsapp"))) {
      return "واتساب للأعمال";
    }

    const FRIENDLY_APP_NAMES: Record<string, string> = {
      "telegram-business": "تيليجرام للأعمال",
      "telegram-integration": "تكامل تيليجرام",
      "unified-inbox": "صندوق المحادثات الموحد",
      "crm-lite": "إدارة العملاء CRM",
      "crm-basic": "إدارة العملاء الأساسي",
      "dental-lab-app": "معمل الأسنان",
      "dental-lab": "معمل الأسنان",
      "booking-app": "نظام الحجوزات",
    };

    const names = requiredAppSlugs.map((slug) => {
      const lower = slug.trim().toLowerCase();
      if (FRIENDLY_APP_NAMES[lower]) return FRIENDLY_APP_NAMES[lower];

      const reg = APP_REGISTRY.find(
        (a) =>
          a.id.toLowerCase() === lower ||
          a.requiredApps?.some((r) => r.toLowerCase() === lower)
      );
      if (reg) {
        const translated = t(reg.nameKey);
        if (translated && translated !== reg.nameKey) return translated;
        return reg.displayName || slug;
      }
      return slug;
    });

    return Array.from(new Set(names)).join(" أو ");
  }, [requiredAppSlugs, t]);

  useEffect(() => {
    if (!hasAccess && isAuthenticated && user && user.role !== "SUPER_ADMIN") {
      if (redirectMode !== "overlay-blur") {
        toast.error(
          `هذه الصفحة تتطلب اشتراكاً سارياً في تطبيق «${formattedAppNames}». يرجى تجديد أو تفعيل الاشتراك للمتابعة.`
        );
      }
    }
  }, [hasAccess, isAuthenticated, user, formattedAppNames, redirectMode]);

  if (!hasAccess) {
    if (redirectMode === "overlay-blur") {
      return (
        <div className="relative w-full h-full min-h-[calc(100vh-4rem)] overflow-hidden isolate">
          {/* Blurred locked underlying app */}
          <div
            className="w-full h-full pointer-events-none select-none filter blur-md opacity-35 grayscale-[20%] transition-all"
            aria-hidden="true"
            tabIndex={-1}
          >
            {children}
          </div>

          {/* Locked Overlay Backdrop & Renewal Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="expired-subscription-title"
              aria-describedby="expired-subscription-desc"
              className="relative w-full max-w-md bg-card/95 border border-border/80 shadow-2xl rounded-2xl p-6 sm:p-7 text-center space-y-5 backdrop-blur-md"
            >
              {/* Lock Badge */}
              <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-inner">
                <Lock className="w-7 h-7" />
              </div>

              {/* Status & Copy */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  <span>انتهى الاشتراك الشهري</span>
                </div>
                <h2 id="expired-subscription-title" className="text-xl font-bold tracking-tight text-foreground">
                  اشتراك «{formattedAppNames}» منتهي
                </h2>
                <p id="expired-subscription-desc" className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  لقد انتهت فترة الاشتراك في خدمة «{formattedAppNames}». تم إيقاف وتشفير إمكانية إرسال واستقبال المحادثات حتى يتم تجديد الاشتراك.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/marketplace/${encodeURIComponent(primarySlug)}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تجديد الاشتراك الآن</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-secondary-foreground text-sm font-medium transition-all active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>العودة إلى لوحة التحكم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (redirectMode === "screen") {
      return (
        <AccessDenied
          title="اشتراك غير مفعّل أو منتهي"
          message={`هذه الصفحة تتطلب تفعيل أو تجديد اشتراك تطبيق «${formattedAppNames}». يرجى تجديد الاشتراك من متجر التطبيقات للمتابعة.`}
          primaryActionText={`الانتقال لصفحة الاشتراك والتجديد («${formattedAppNames}»)`}
          primaryActionPath={`/marketplace/${encodeURIComponent(primarySlug)}`}
        />
      );
    }

    return (
      <Navigate
        to={`/marketplace/${encodeURIComponent(primarySlug)}`}
        replace
        state={{
          accessDenied: true,
          requiredApp: primarySlug,
          appName: formattedAppNames,
          from: location.pathname,
          reason: "subscription_required_or_expired",
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AppAccessRoute;
