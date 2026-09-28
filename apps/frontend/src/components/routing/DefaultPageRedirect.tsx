import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import { resolvePostAuthDestination, saveDefaultPagePreference } from "../../utils/postAuthRouting";

export function DefaultPageRedirect() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Warm the local default-page cache from the server so the user's saved
    // preference keeps working, then let the unified resolver decide the
    // landing (saved default → last page → role fallback).
    apiClient
      .get("/user/settings", { _skipErrorToast: true } as Record<string, unknown>)
      .then((res: any) => {
        const dp = res?.data?.data?.defaultPage;
        if (dp) {
          saveDefaultPagePreference(user, dp);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">جاري التوجيه...</p>
        </div>
      </div>
    );
  }

  const destination = resolvePostAuthDestination(user);
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={`${destination}${search}`} replace />;
}
