import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import AccessDenied from "./AccessDenied";
import { normalizeRole } from "../../utils/routeAccess";

interface CompanyProtectedRouteProps {
  children: ReactNode;
  requiredCompanyId?: string;
  allowSuperAdmin?: boolean;
  fallback?: ReactNode;
}

const CompanyProtectedRoute: React.FC<CompanyProtectedRouteProps> = ({
  children,
  requiredCompanyId,
  allowSuperAdmin = true,
  fallback,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { companyId, canAccessCompany } = useCompany();

  // Check authentication first
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background/95 p-4 text-foreground" dir="rtl">
        <div className="text-center bg-card border border-border/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              مطلوب تسجيل الدخول
            </h3>
            <p className="text-xs text-muted-foreground">
              يجب تسجيل الدخول للوصول لهذه الصفحة وبيانات الشركة.
            </p>
          </div>
          <button
            onClick={() => (window.location.href = "/auth/login")}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 active:scale-97 transition-all cursor-pointer shadow-xs"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // Super admin bypass
  if (allowSuperAdmin && user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  // Check company access
  if (requiredCompanyId && !canAccessCompany(requiredCompanyId)) {
    return (
      fallback || (
        <AccessDenied message="ليس لديك صلاحية للوصول لبيانات هذه الشركة" />
      )
    );
  }

  // Check if user has a company
  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background/95 p-4 text-foreground" dir="rtl">
        <div className="text-center bg-card border border-border/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              لا توجد شركة مرتبطة
            </h3>
            <p className="text-xs text-muted-foreground">
              لم يتم ربط حسابك بأي شركة نشطة في الوقت الحالي.
            </p>
          </div>
          <button
            onClick={() => (window.location.href = "/auth/login")}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 active:scale-97 transition-all cursor-pointer shadow-xs"
          >
            تسجيل الدخول مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// HOC version
export const withCompanyProtection = (
  requiredCompanyId?: string,
  allowSuperAdmin: boolean = true,
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    return (props: P) => (
      <CompanyProtectedRoute
        requiredCompanyId={requiredCompanyId}
        allowSuperAdmin={allowSuperAdmin}
      >
        <Component {...props} />
      </CompanyProtectedRoute>
    );
  };
};

// Role-based protection
interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background/95 p-4 text-foreground" dir="rtl">
        <div className="text-center bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              مطلوب تسجيل الدخول
            </h3>
            <p className="text-xs text-muted-foreground">
              يجب تسجيل الدخول للوصول لهذه الصفحة
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userRoleNormalized = normalizeRole(user.role);
  const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRole(r));

  if (!normalizedAllowedRoles.includes(userRoleNormalized) && !allowedRoles.includes(user.role)) {
    return fallback || <AccessDenied />;
  }

  return <>{children}</>;
};

// Permission-based protection (checks user.permissions[])
interface PermissionProtectedRouteProps {
  children: ReactNode;
  requiredPermissions: string[];
  fallbackRedirect?: string;
}

export const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  requiredPermissions,
  fallbackRedirect,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background/95 p-4 text-foreground" dir="rtl">
        <div className="text-center bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              مطلوب تسجيل الدخول
            </h3>
            <p className="text-xs text-muted-foreground">
              يجب تسجيل الدخول للوصول لهذه الصفحة
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userPerms = user.permissions || [];
  const hasAccess =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((p) => userPerms.includes(p));

  if (!hasAccess) {
    if (fallbackRedirect) {
      return <Navigate to={fallbackRedirect} replace />;
    }
    return <AccessDenied />;
  }

  return <>{children}</>;
};

export default CompanyProtectedRoute;
