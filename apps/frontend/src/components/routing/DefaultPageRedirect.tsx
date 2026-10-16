import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">جاري التوجيه...</p>
        </div>
      </div>
    );
  }

  const destination = resolvePostAuthDestination(user);
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={`${destination}${search}`} replace />;
}

export default DefaultPageRedirect;
