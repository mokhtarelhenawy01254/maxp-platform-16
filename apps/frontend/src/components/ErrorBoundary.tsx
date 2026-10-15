import React, { Component, ErrorInfo, ReactNode } from "react";
// Inline SVG replaces @heroicons/react which is not installed
const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);
import errorTracking from "../services/errorTracking";
import {
  recoverFromChunkLoadError,
  isChunkLoadError,
  emergencyPurgeAndHardReload,
} from "../utils/chunkLoadRecovery";

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

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
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (recoverFromChunkLoadError(error, "error-boundary")) {
      return;
    }

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // Log error to monitoring service in production
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
        digest: (error as any).digest, // minified React error group ID
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
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = Boolean(this.state.error && isChunkLoadError(this.state.error));

      // Specialized graceful update fallback for chunk loading failures
      if (isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                تم تحديث المنصة
              </h2>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                تم إصدار تحديث جديد للنظام أثناء عملك. يرجى تحديث الصفحة لتشغيل أحدث نسخة خالية من المشاكل.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  تحديث ومتابعة
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.href = "/"; }}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                >
                  الرئيسية
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Default fallback UI for unexpected runtime errors
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                حدث خطأ غير متوقع
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                نعتذر، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى أو إعادة تحميل
                الصفحة.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
                    Error Details (Development Only):
                  </h3>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {"\n\n"}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
                >
                  المحاولة مرة أخرى
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                >
                  إعادة تحميل الصفحة
                </button>
              </div>

              <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                <p>
                  إذا استمر هذا الخطأ، يرجى{" "}
                  <a
                    href="mailto:support@example.com"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    التواصل مع الدعم الفني
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
