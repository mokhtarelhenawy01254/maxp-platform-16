import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import LoadingSpinner from "./LoadingSpinner";
import Layout from "./Layout";

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
      console.log("⏱️ [ProtectedRoute] Redirecting now...");
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, isReviewRoute]);

  // Debug logging
  if (isReviewRoute) {
    console.log("🔍 [ProtectedRoute] /products/reviews accessed");
    console.log("🔍 [ProtectedRoute] isLoading:", isLoading);
    console.log("🔍 [ProtectedRoute] isAuthenticated:", isAuthenticated);
    console.log("🔍 [ProtectedRoute] user:", user ? "exists" : "null");
    console.log("🔍 [ProtectedRoute] token:", hasAccessToken ? "exists" : "missing");
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    if (isReviewRoute) {
      console.log("⏳ [ProtectedRoute] Still loading, showing spinner...");
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (isReviewRoute) {
      console.error(
        "❌ [ProtectedRoute] Not authenticated, redirecting to login",
      );
      console.error("❌ [ProtectedRoute] User:", user);
      console.error("❌ [ProtectedRoute] Token:", hasAccessToken ? "exists" : "missing");

      if (showRedirectMessage) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-yellow-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <h2 className="text-2xl font-bold text-yellow-800 mb-4">
                ⚠️ مطلوب تسجيل الدخول
              </h2>
              <p className="text-gray-700 mb-4">
                سيتم تحويلك إلى صفحة تسجيل الدخول...
              </p>
              <p className="text-sm text-gray-500">
                تحقق من Console (F12) لمعرفة التفاصيل
              </p>
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
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            غير مصرح لك
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
          </p>
        </div>
      </Layout>
    );
  }

  // Render children with layout
  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
