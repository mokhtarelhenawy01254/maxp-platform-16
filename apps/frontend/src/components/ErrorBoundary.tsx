import React, { Component, ErrorInfo, ReactNode } from "react";
// Inline SVG replaces @heroicons/react which is not installed
const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);
import { Button } from "./ui/button";
import errorTracking from "../services/errorTracking";
import { recoverFromChunkLoadError } from "../utils/chunkLoadRecovery";

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
      // Import dynamic to avoid circular dependency if possible, or just use global
      // Note: errorTracking is already imported in many files, here we just use it
      errorTracking.logError("ErrorBoundary caught error", error, {
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

      // Default fallback UI
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
                <Button onClick={this.handleReset}>
                  المحاولة مرة أخرى
                </Button>

                <Button variant="outline" onClick={this.handleReload}>
                  إعادة تحميل الصفحة
                </Button>
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
