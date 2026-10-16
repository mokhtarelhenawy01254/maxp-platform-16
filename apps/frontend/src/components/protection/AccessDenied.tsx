import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { resolvePostAuthDestination } from "../../utils/postAuthRouting";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBack?: boolean;
  primaryActionText?: string;
  primaryActionPath?: string;
}

/**
 * Unified "no access" screen used by every route guard. Gives the user a
 * working escape route (their allowed home or action path) instead of a dead-end page.
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "ممنوع الوصول",
  message = "ليس لديك الصلاحية المطلوبة للوصول لهذه الصفحة",
  showBack = true,
  primaryActionText,
  primaryActionPath,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedHome = resolvePostAuthDestination(user);
  // Never offer the page the user is currently denied from — avoid a bounce loop.
  const homePath =
    resolvedHome === location.pathname ? "/marketplace" : resolvedHome;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center shadow-xl sm:p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-2xs">
          <ShieldAlert className="size-6" />
        </div>
        <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h3>
        <p className="mb-6 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {message}
        </p>

        <div className="flex flex-col gap-2.5">
          {primaryActionText && primaryActionPath && (
            <button
              type="button"
              onClick={() => navigate(primaryActionPath)}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              {primaryActionText}
            </button>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate(homePath, { replace: true })}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 active:scale-[0.98]"
            >
              <Home className="size-3.5 text-muted-foreground" />
              <span>الصفحة الرئيسية</span>
            </button>
            {showBack && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-[0.98]"
              >
                <ArrowLeft className="size-3.5" />
                <span>العودة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
