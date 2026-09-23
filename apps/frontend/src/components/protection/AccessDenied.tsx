import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{message}</p>
        
        <div className="flex flex-col gap-2.5">
          {primaryActionText && primaryActionPath && (
            <button
              type="button"
              onClick={() => navigate(primaryActionPath)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-medium text-sm transition shadow-sm"
            >
              {primaryActionText}
            </button>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate(homePath, { replace: true })}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition"
            >
              الانتقال لصفحتك الرئيسية
            </button>
            {showBack && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="py-2 px-4 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-[0.98] text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium transition"
              >
                العودة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
