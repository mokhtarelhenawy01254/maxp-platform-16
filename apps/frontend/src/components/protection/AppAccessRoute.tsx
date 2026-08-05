import React, { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuthSimple";
import AccessDenied from "./AccessDenied";

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

  const activeApps = Array.isArray(user?.company?.activeApps)
    ? user.company.activeApps
    : Array.isArray(user?.activeApps)
      ? user.activeApps
      : [];

  const hasAccess = requiredAppSlugs.some((slug) =>
    activeApps.some((a) => String(a?.slug || a) === slug),
  );

  if (!hasAccess) {
    return <AccessDenied message="هذه الميزة تتطلب تفعيل تطبيق مخصص. يرجى تفعيل التطبيق من متجر التطبيقات." />;
  }

  return <>{children}</>;
};

export default AppAccessRoute;
