import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import AccessDenied from "./AccessDenied";
import { APP_REGISTRY } from "../../config/appRegistry";

interface AppAccessRouteProps {
  children: ReactNode;
  requiredAppSlugs: string[];
}

/**
 * Protects a route based on whether the company has one of the required
 * marketplace apps active. SUPER_ADMIN always bypasses.
 */
export const AppAccessRoute: React.FC<AppAccessRouteProps> = ({
  children,
  requiredAppSlugs,
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h3 className="text-yellow-800 font-semibold mb-2">
              مطلوب تسجيل الدخول
            </h3>
            <p className="text-yellow-700 mb-4">
              يجب تسجيل الدخول للوصول لهذه الصفحة
            </p>
          </div>
        </div>
      </div>
    );
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
    const target = requiredSlug.trim().toLowerCase();
    return activeApps.some((a) => {
      if (typeof a === 'string') return a.trim().toLowerCase() === target;
      if (a && typeof a === 'object') {
        const obj = a as { slug?: string; app?: { slug?: string } };
        if (typeof obj.slug === 'string' && obj.slug.trim().toLowerCase() === target) return true;
        if (obj.app && typeof obj.app.slug === 'string' && obj.app.slug.trim().toLowerCase() === target) return true;
      }
      return false;
    });
  });

  if (!hasAccess) {
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

    return (
      <AccessDenied
        title="تطبيق غير مفعّل"
        message={`هذه الصفحة تتطلب تفعيل تطبيق «${formattedAppNames}». يرجى تفعيل التطبيق من متجر التطبيقات للمتابعة.`}
        primaryActionText={`الانتقال لمتجر التطبيقات لتفعيل «${formattedAppNames}»`}
        primaryActionPath={`/marketplace?search=${encodeURIComponent(requiredAppSlugs[0] || "")}`}
      />
    );
  }

  return <>{children}</>;
};

export default AppAccessRoute;
