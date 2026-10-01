import React, { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  redirectMode?: "redirect" | "screen";
}

/**
 * Protects a route based on whether the company has one of the required
 * marketplace apps active.
 * If subscription is missing or expired, redirects to the marketplace subscription/renewal page.
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

  const formattedAppNames = requiredAppSlugs
    .map((slug) => {
      const reg = APP_REGISTRY.find((a) => a.id.toLowerCase() === slug.trim().toLowerCase());
      if (reg) {
        const translated = t(reg.nameKey);
        if (translated && translated !== reg.nameKey) return translated;
        return reg.displayName || slug;
      }
      return slug;
    })
    .join(" أو ");

  useEffect(() => {
    if (!hasAccess && isAuthenticated && user && user.role !== "SUPER_ADMIN") {
      toast.error(
        `هذه الصفحة تتطلب اشتراكاً سارياً في تطبيق «${formattedAppNames}». يرجى تجديد أو تفعيل الاشتراك للمتابعة.`
      );
    }
  }, [hasAccess, isAuthenticated, user, formattedAppNames]);

  if (!hasAccess) {
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
