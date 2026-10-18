import { Component, ErrorInfo, ReactNode } from "react";
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Home,
} from "lucide-react";
import errorTracking from "../../services/errorTracking";
import {
  recoverFromChunkLoadError,
  isChunkLoadError,
  emergencyPurgeAndHardReload,
} from "../../utils/chunkLoadRecovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (recoverFromChunkLoadError(error, "error-boundary")) {
      return;
    }
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    try {
      let chunkName = (error as any)?.chunkName;
      if (!chunkName && errorInfo.componentStack) {
        const matches = errorInfo.componentStack.match(/\bat\s+([A-Za-z0-9_]+)/g);
        if (matches) {
          const names = matches
            .map((m) => m.replace(/^at\s+/, ""))
            .filter((n) => n !== "Lazy" && n !== "Suspense" && n !== "Route" && n !== "Routes");
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
        url: typeof window !== "undefined" ? window.location.href : "",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
      });
    } catch {}

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      void emergencyPurgeAndHardReload();
      return;
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunk = Boolean(this.state.error && isChunkLoadError(this.state.error));

      if (isChunk) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
            <div className="max-w-md w-full bg-card p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xl text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">تم تحديث النظام</h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  تم نشر نسخة محدثة من المنصة. يرجى تحديث الصفحة لتشغيل أحدث إصدار وتفادي أي أخطاء.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
                <button
                  type="button"
                  onClick={() => { void emergencyPurgeAndHardReload(); }}
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
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                حدث خطأ غير متوقع
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو تحديث الصفحة.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-3 text-left p-3 rounded-xl bg-muted/60 border border-border/70">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                  تفاصيل الخطأ التقنية (بيئة التطوير)
                </summary>
                <pre className="mt-2 text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-auto max-h-36 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>المحاولة مرة أخرى</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
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
