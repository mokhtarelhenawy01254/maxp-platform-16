import { Component, ErrorInfo, ReactNode } from "react";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
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
          <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 text-blue-600">
                <ArrowPathIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">تم تحديث النظام</h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  تم نشر نسخة محدثة من المنصة. يرجى تحديث الصفحة لتشغيل أحدث إصدار وتفادي أي أخطاء.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => { void emergencyPurgeAndHardReload(); }}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  تحديث الصفحة الآن
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = "/"; }}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  الرئيسية
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                حدث خطأ غير متوقع
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    تفاصيل الخطأ (للمطورين)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={this.handleRetry}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <ArrowPathIcon className="w-5 h-5 ml-2" />
                إعادة المحاولة
              </button>

              <button
                onClick={() => window.location.reload()}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
