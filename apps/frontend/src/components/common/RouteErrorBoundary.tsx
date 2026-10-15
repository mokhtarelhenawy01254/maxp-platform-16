import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, ArrowRight, RotateCw } from "lucide-react";
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
    // If the user navigates away to another route, automatically reset the error state!
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
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {this.props.fallbackTitle || "تعذر تحميل هذه الشاشة"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                حدث خطأ تقني غير متوقع أثناء عرض هذه الصفحة. يمكنك إعادة المحاولة أو الانتقال لصفحة أخرى من القائمة الجانبية.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
              >
                <RotateCw className="size-3.5" />
                إعادة تحميل الشاشة
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted active:scale-95 transition-all"
              >
                <ArrowRight className="size-3.5" />
                العودة للرئيسية
              </button>
            </div>

            {envConfig.isDevelopment && this.state.error && (
              <details className="mt-4 text-start rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <summary className="cursor-pointer font-mono font-semibold">
                  تفاصيل الخطأ للمطورين (Dev Mode)
                </summary>
                <pre className="mt-2 overflow-auto max-h-48 text-[11px] font-mono whitespace-pre-wrap">
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
