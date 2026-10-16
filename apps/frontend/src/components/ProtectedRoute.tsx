import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import LoadingSpinner from "./LoadingSpinner";
import Layout from "./Layout";
import AccessDenied from "./protection/AccessDenied";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showRedirectMessage, setShowRedirectMessage] = React.useState(false);
  const currentPath = location.pathname;
  const isReviewRoute = currentPath === "/products/reviews";
  const hasAccessToken = tokenManager.hasAccessToken();

  React.useEffect(() => {
    if (!isReviewRoute || isLoading || isAuthenticated) {
      setShowRedirectMessage(false);
      return;
    }

    setShowRedirectMessage(true);
    const timer = setTimeout(() => {
      console.log("[ProtectedRoute] Redirecting now...");
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, isReviewRoute]);

  // Debug logging
  if (isReviewRoute) {
    console.log("[ProtectedRoute] /products/reviews accessed");
    console.log("[ProtectedRoute] isLoading:", isLoading);
    console.log("[ProtectedRoute] isAuthenticated:", isAuthenticated);
    console.log("[ProtectedRoute] user:", user ? "exists" : "null");
    console.log("[ProtectedRoute] token:", hasAccessToken ? "exists" : "missing");
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    if (isReviewRoute) {
      console.log("[ProtectedRoute] Still loading, showing spinner...");
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (isReviewRoute) {
      console.error(
        "[ProtectedRoute] Not authenticated, redirecting to login",
      );
      console.error("[ProtectedRoute] User:", user);
      console.error("[ProtectedRoute] Token:", hasAccessToken ? "exists" : "missing");

      if (showRedirectMessage) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background/95 p-4" dir="rtl">
            <div className="text-center p-6 bg-card border border-border/80 rounded-2xl shadow-xl max-w-md w-full space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">
                  مطلوب تسجيل الدخول
                </h2>
                <p className="text-xs text-muted-foreground">
                  جاري تحويلك إلى صفحة تسجيل الدخول تلقائياً...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>يرجى الانتظار</span>
              </div>
            </div>
          </div>
        );
      }
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check role permissions if required
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return (
      <Layout>
        <AccessDenied />
      </Layout>
    );
  }

  // Render children with layout
  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
