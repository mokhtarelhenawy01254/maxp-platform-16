import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import errorTracking from "../../services/errorTracking";
import { recoverFromChunkLoadError } from "../../utils/chunkLoadRecovery";
import { envConfig } from "../../config/environment";

interface Props {
  children: ReactNode;
  routeKey?: string;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  prevRouteKey?: string;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      prevRouteKey: props.routeKey,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.routeKey && props.routeKey !== state.prevRouteKey) {
      return {
        hasError: false,
        error: null,
        errorInfo: null,
        prevRouteKey: props.routeKey,
      };
    }
    return null;
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (recoverFromChunkLoadError(error, "route-error-boundary")) {
      return;
    }

    console.error("[RouteErrorBoundary] Caught error:", error, errorInfo);

    try {
      errorTracking.logError("RouteErrorBoundary caught unhandled screen error", error, {
        componentStack: errorInfo.componentStack,
        url: typeof window !== "undefined" ? window.location.href : "",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        routeKey: this.props.routeKey,
      });
    } catch {
      // Ignore logging failures
    }

    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[420px] w-full items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card p-6 shadow-xl sm:p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {this.props.fallbackTitle || "تعذر تحميل هذه الشاشة"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                حدث خطأ غير متوقع أثناء معالجة بيانات هذه الصفحة. يمكنك إعادة المحاولة أو الانتقال لصفحة أخرى من القائمة.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                <RotateCcw className="size-3.5" />
                إعادة المحاولة
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Home className="size-3.5" />
                العودة للرئيسية
              </button>
            </div>

            {envConfig.isDevelopment && this.state.error && (
              <details className="mt-4 text-start rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <summary className="cursor-pointer font-mono font-semibold">
                  تفاصيل الخطأ (بيئة التطوير)
                </summary>
                <pre className="mt-2 overflow-auto max-h-48 text-[11px] font-mono tabular-nums whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
