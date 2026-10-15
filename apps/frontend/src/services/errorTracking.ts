/**
 * Error Tracking & Logging Service
 * نظام متقدم لتتبع وتسجيل الأخطاء
 */

import tokenManager from "../utils/tokenManager";

type ErrorContext = Record<string, unknown>;

interface ErrorLike {
  name?: string;
  message?: string;
  stack?: string;
  code?: number | string;
  response?: {
    status?: number;
  };
}

interface WindowWithOriginalConsoleError extends Window {
  _originalConsoleError?: typeof console.error;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: "error" | "warning" | "info";
  category: "api" | "ui" | "network" | "auth" | "validation" | "unknown";
  message: string;
  chunkName?: string;
  componentStack?: string;
  stack?: string;
  context?: ErrorContext;
  userId?: string;
  companyId?: string;
  userAgent: string;
  url: string;
  severity: "low" | "medium" | "high" | "critical";
}

class ErrorTrackingService {
  private errors: ErrorLog[] = [];
  private maxErrors = 100; // Maximum errors to store in memory
  private isProduction = import.meta.env.PROD;
  private isDevelopment = import.meta.env.DEV;
  private isInternalLogging = false;

  /**
   * تسجيل خطأ جديد
   */
  logError(
    message: string,
    error?: unknown,
    context?: ErrorContext,
  ): void {
    const errorDetails = this.getErrorDetails(error);
    const chunkName =
      (context?.chunkName as string) ||
      ((error && typeof error === "object" && "chunkName" in error)
        ? String((error as Record<string, unknown>).chunkName)
        : undefined);
    const componentStack =
      (context?.componentStack as string) ||
      ((error && typeof error === "object" && "componentStack" in error)
        ? String((error as Record<string, unknown>).componentStack)
        : undefined);

    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "error",
      category: this.categorizeError(error),
      message,
      chunkName,
      componentStack,
      stack: errorDetails.stack,
      context: {
        ...context,
        chunkName,
        componentStack,
        errorName: errorDetails.name,
        errorMessage: errorDetails.message,
      },
      userId: this.getUserId(),
      companyId: this.getCompanyId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.getSeverity(error),
    };

    // Store in memory
    this.errors.push(errorLog);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift(); // Remove oldest error
    }

    // Console log in development
    if (this.isDevelopment) {
      console.error("🔴 Error Tracked:", {
        message,
        error,
        context,
        errorLog,
      });
    }

    // Send to backend in production
    if (this.isProduction && !this.isInternalLogging) {
      this.sendToBackend(errorLog);
    }

    // Store in localStorage for debugging
    this.saveToLocalStorage(errorLog);
  }

  /**
   * تسجيل تحذير
   */
  logWarning(message: string, context?: ErrorContext): void {
    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "warning",
      category: "unknown",
      message,
      context,
      userId: this.getUserId(),
      companyId: this.getCompanyId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: "low",
    };

    this.errors.push(warningLog);

    if (this.isDevelopment) {
      console.warn("⚠️ Warning Tracked:", message, context);
    }
  }

  /**
   * تسجيل معلومة
   */
  logInfo(message: string, context?: ErrorContext): void {
    if (this.isDevelopment) {
      console.info("ℹ️ Info:", message, context);
    }
  }

  /**
   * تصنيف نوع الخطأ
   */
  private categorizeError(error: unknown): ErrorLog["category"] {
    if (!error) return "unknown";

    const errorDetails = this.getErrorDetails(error);
    const message = errorDetails.message?.toLowerCase() || "";
    const name = errorDetails.name?.toLowerCase() || "";

    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("fetch")
    ) {
      return "network";
    }

    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return "auth";
    }

    if (
      message.includes("400") ||
      message.includes("validation") ||
      message.includes("invalid")
    ) {
      return "validation";
    }

    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    ) {
      return "api";
    }

    if (
      name.includes("react") ||
      name.includes("render") ||
      message.includes("component")
    ) {
      return "ui";
    }

    return "unknown";
  }

  /**
   * تحديد درجة خطورة الخطأ
   */
  private getSeverity(error: unknown): ErrorLog["severity"] {
    if (!error) return "low";

    const errorDetails = this.getErrorDetails(error);
    const status = errorDetails.response?.status;
    const message = errorDetails.message?.toLowerCase() || "";

    // Critical errors
    if (
      status === 500 ||
      status === 503 ||
      message.includes("critical") ||
      message.includes("fatal")
    ) {
      return "critical";
    }

    // High severity
    if (
      status === 401 ||
      status === 403 ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return "high";
    }

    // Medium severity
    if (
      status === 400 ||
      status === 404 ||
      message.includes("validation") ||
      message.includes("not found")
    ) {
      return "medium";
    }

    return "low";
  }

  /**
   * إرسال الخطأ للـ Backend
   */
  private async sendToBackend(errorLog: ErrorLog): Promise<void> {
    try {
      const accessToken = tokenManager.getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/v1/errors/log", {
        method: "POST",
        headers,
        body: JSON.stringify(errorLog),
      });

      if (!response.ok) {
        this.safeError("Failed to send error to backend", { status: response.status });
      }
    } catch (err) {
      // Silently fail - don't create infinite loop
      this.safeError("Error sending error log:", err);
    }
  }

  /**
   * تسجيل خطأ داخلي دون الدخول في حلقة مفرغة
   */
  private safeError(message: string, ...args: unknown[]): void {
    const windowWithOriginalConsoleError =
      window as WindowWithOriginalConsoleError;
    const originalConsoleError =
      windowWithOriginalConsoleError._originalConsoleError || console.error;
    this.isInternalLogging = true;
    try {
      originalConsoleError.apply(console, [
        `[ErrorTracking-Internal] ${message}`,
        ...args,
      ]);
    } finally {
      this.isInternalLogging = false;
    }
  }

  private getErrorDetails(error: unknown): ErrorLike {
    if (error instanceof Error) {
      return error as ErrorLike;
    }

    if (typeof error === "object" && error !== null) {
      return error as ErrorLike;
    }

    return {};
  }

  /**
   * حفظ الخطأ في LocalStorage
   */
  private saveToLocalStorage(errorLog: ErrorLog): void {
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push(errorLog);

      // Keep only last 20 errors to prevent quota issues
      const recentErrors = storedErrors.slice(-20);

      localStorage.setItem("app_errors", JSON.stringify(recentErrors));
    } catch (err: unknown) {
      const errorDetails = this.getErrorDetails(err);
      // On QuotaExceededError: clear old errors and retry once
      if (
        errorDetails.name === "QuotaExceededError" ||
        errorDetails.code === 22
      ) {
        try {
          localStorage.removeItem("app_errors");
          localStorage.setItem("app_errors", JSON.stringify([errorLog]));
        } catch {
          // Silently fail — localStorage may be completely full
        }
      }
      // Use safeError to avoid triggering the production console.error override loop
      this.safeError("Failed to save error to localStorage:", err);
    }
  }

  /**
   * جلب الأخطاء المحفوظة
   */
  getStoredErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem("app_errors");
      return stored ? (JSON.parse(stored) as ErrorLog[]) : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * مسح الأخطاء المحفوظة
   */
  clearStoredErrors(): void {
    localStorage.removeItem("app_errors");
    this.errors = [];
  }

  /**
   * جلب آخر الأخطاء
   */
  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errors.slice(-count);
  }

  /**
   * فلترة الأخطاء حسب النوع
   */
  getErrorsByCategory(category: ErrorLog["category"]): ErrorLog[] {
    return this.errors.filter((err) => err.category === category);
  }

  /**
   * فلترة الأخطاء حسب الخطورة
   */
  getErrorsBySeverity(severity: ErrorLog["severity"]): ErrorLog[] {
    return this.errors.filter((err) => err.severity === severity);
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * جلب معرف المستخدم
   */
  private getUserId(): string | undefined {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return undefined;
      const user = JSON.parse(userStr) as { id?: string; _id?: string };
      return user ? user.id || user._id : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * جلب معرف الشركة
   */
  private getCompanyId(): string | undefined {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return undefined;
      const user = JSON.parse(userStr) as { companyId?: string };
      return user ? user.companyId : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * معالجة الأخطاء غير المتوقعة
   */
  setupGlobalErrorHandlers(): void {
    // Window error handler
    window.addEventListener("error", (event) => {
      this.logError(`Uncaught Error: ${event.message}`, event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.logError(
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason,
        {
          promise: event.promise,
        },
      );
    });

    // Console error override (optional)
    if (this.isProduction) {
      if (typeof window !== "undefined") {
        const originalConsoleError = console.error;
        const windowWithOriginalConsoleError =
          window as WindowWithOriginalConsoleError;
        windowWithOriginalConsoleError._originalConsoleError =
          originalConsoleError;
        let isLogging = false;

        console.error = (...args: unknown[]) => {
          // Prevent infinite loops and ignore internal service logs
          if (isLogging || this.isInternalLogging) {
            originalConsoleError.apply(console, args);
            return;
          }

          try {
            isLogging = true;
            // Safely convert arguments to string
            const safeStringify = (obj: unknown) => {
              try {
                return JSON.stringify(
                  obj,
                  (_key, value: unknown) =>
                    typeof value === "bigint" ? value.toString() : value,
                  2,
                );
              } catch (_error) {
                return "[Unstringifiable Object]";
              }
            };

            const message = args
              .map((arg) => (typeof arg === "string" ? arg : safeStringify(arg)))
              .join(" ");

            const error =
              args.find((arg) => arg instanceof Error) || new Error(message);

            this.logError("Console Error", error, {
              originalArgs: args.map((arg) =>
                typeof arg === "object" ? safeStringify(arg) : String(arg),
              ),
            });
          } catch (error) {
            // If our logging fails, just use original console error
            originalConsoleError.apply(console, [
              "Failed to log console error:",
              error,
            ]);
          } finally {
            isLogging = false;
            originalConsoleError.apply(console, args);
          }
        };
      }
    }
  }

  /**
   * تصدير الأخطاء كـ JSON
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * تصدير الأخطاء كـ CSV
   */
  exportErrorsAsCSV(): string {
    const headers = [
      "Timestamp",
      "Type",
      "Category",
      "Message",
      "Severity",
      "URL",
    ];
    const rows = this.errors.map((err) => [
      err.timestamp,
      err.type,
      err.category,
      err.message,
      err.severity,
      err.url,
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }
}

// Create singleton instance
const errorTracking = new ErrorTrackingService();

// Setup global handlers
errorTracking.setupGlobalErrorHandlers();

export default errorTracking;
