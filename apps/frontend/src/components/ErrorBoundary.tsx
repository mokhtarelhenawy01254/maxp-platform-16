import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Home } from "lucide-react";
import errorTracking from "../services/errorTracking";
import {
  recoverFromChunkLoadError,
  isChunkLoadError,
  emergencyPurgeAndHardReload,
} from "../utils/chunkLoadRecovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (recoverFromChunkLoadError(error, "error-boundary")) {
      return;
    }

    if (import.meta.env.DEV) {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo): void => {
    try {
      let chunkName = (error as any)?.chunkName;
      if (!chunkName && errorInfo.componentStack) {
        const matches = errorInfo.componentStack.match(/\bat\s+([A-Za-z0-9_]+)/g);
        if (matches) {
          const names = matches
            .map((m) => m.replace(/^at\s+/, ""))
            .filter((n) => n !== "Lazy" && n !== "Suspense" && n !== "Route" && n !== "Routes" && n !== "RouteAwareErrorBoundary");
          if (names.length > 0) {
            chunkName = names[0];
          }
        }
      }
      if (!chunkName && typeof window !== "undefined") {
        const segs = window.location.pathname.split("/").filter(Boolean);
        chunkName = segs[segs.length - 1] || "root";
      }

      errorTracking.logError("ErrorBoundary caught error: " + (chunkName ? `[${chunkName}] ` : "") + error.message, error, {
        chunkName,
        componentStack: errorInfo.componentStack,
        digest: (error as any).digest,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        pathname: window.location.pathname,
      });
    } catch (loggingError) {
      console.error("Failed to log error to monitoring service:", loggingError);
    }
  };

  private handleReload = (): void => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      void emergencyPurgeAndHardReload();
      return;
    }
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = Boolean(this.state.error && isChunkLoadError(this.state.error));

      if (isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
            <div className="max-w-md w-full bg-card p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xl text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  تم نشر تحديث جديد للمنصة
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  تم إصدار تحديث تقني جديد أثناء جلستك. يرجى تحديث الصفحة لمتابعة العمل على أحدث نسخة وتفادي أي أخطاء.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث الصفحة الآن</span>
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.href = "/"; }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>الصفحة الرئيسية</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
          <div className="max-w-md w-full bg-card p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xl text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                حدث خطأ تقني غير متوقع
              </h1>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                نعتذر، واجه النظام خطأ أثناء معالجة الشاشة الحالية. يمكنك إعادة المحاولة أو إعادة تحميل الصفحة.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-muted/60 rounded-xl border border-border/70 text-left text-xs font-mono space-y-1 overflow-auto max-h-40">
                <span className="text-[11px] text-muted-foreground block font-semibold">تفاصيل الخطأ (بيئة التطوير):</span>
                <pre className="text-rose-600 dark:text-rose-400 text-[10px] whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>المحاولة مرة أخرى</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تحميل الصفحة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
