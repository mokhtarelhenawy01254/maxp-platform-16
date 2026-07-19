import { ErrorState } from "../hooks/useErrorHandler";

/**
 * Error Logger Utility
 * نظام تسجيل الأخطاء بشكل منظم ومفصل
 */

interface ErrorLog {
  timestamp: string;
  errorState: ErrorState;
  userAgent: string;
  url: string;
  sessionId?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // الحد الأقصى للسجلات المحفوظة

  /**
   * تسجيل خطأ جديد
   */
  log(error: ErrorState): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      errorState: error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
    };

    // إضافة السجل
    this.logs.unshift(errorLog);

    // الحفاظ على الحد الأقصى
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // حفظ في localStorage
    this.saveToLocalStorage();

    // طباعة في console في وضع التطوير
    if (import.meta.env.DEV) {
      this.printToConsole(errorLog);
    }

    // إرسال للخادم في وضع الإنتاج
    if (import.meta.env.PROD) {
      this.sendToServer(errorLog);
    }
  }

  /**
   * الحصول على جميع السجلات
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * الحصول على السجلات حسب النوع
   */
  getLogsByType(type: ErrorState["errorType"]): ErrorLog[] {
    return this.logs.filter((log) => log.errorState.errorType === type);
  }

  /**
   * مسح جميع السجلات
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem("error_logs");
  }

  /**
   * تصدير السجلات كـ JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * تصدير السجلات كـ CSV
   */
  exportLogsAsCSV(): string {
    const headers = [
      "التاريخ",
      "النوع",
      "الرسالة",
      "الكود",
      "Endpoint",
      "Method",
      "Status Code",
    ];
    const rows = this.logs.map((log) => [
      log.timestamp,
      log.errorState.errorType,
      log.errorState.errorMessage.replace(/\n/g, " "),
      log.errorState.errorCode || "",
      log.errorState.details?.endpoint || "",
      log.errorState.details?.method || "",
      log.errorState.details?.statusCode || "",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  }

  /**
   * تحميل السجلات من localStorage
   */
  loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem("error_logs");
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load error logs from localStorage", e);
    }
  }

  /**
   * حفظ السجلات في localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem("error_logs", JSON.stringify(this.logs));
    } catch (e) {
      console.error("Failed to save error logs to localStorage", e);
    }
  }

  /**
   * طباعة السجل في console
   */
  private printToConsole(log: ErrorLog): void {
    console.group(`🔴 Error Log - ${log.timestamp}`);
    console.log("Type:", log.errorState.errorType);
    console.log("Message:", log.errorState.errorMessage);
    console.log("Code:", log.errorState.errorCode);
    console.log("URL:", log.url);

    if (log.errorState.details) {
      console.group("Technical Details");
      console.log("Endpoint:", log.errorState.details.endpoint);
      console.log("Method:", log.errorState.details.method);
      console.log("Status Code:", log.errorState.details.statusCode);
      console.log("Request:", log.errorState.details.requestData);
      console.log("Response:", log.errorState.details.responseData);
      console.log("Stack:", log.errorState.details.stackTrace);
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * إرسال السجل للخادم
   */
  private async sendToServer(log: ErrorLog): Promise<void> {
    try {
      // TODO: استبدال هذا بـ API الفعلي
      // await fetch('/api/error-logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log)
      // });

      // في الوقت الحالي، نحفظ فقط في localStorage
      console.log("Error logged (would send to server in production):", log);
    } catch (e) {
      console.error("Failed to send error log to server", e);
    }
  }

  /**
   * الحصول على Session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  getStats() {
    const total = this.logs.length;
    const byType = this.logs.reduce(
      (acc, log) => {
        acc[log.errorState.errorType] =
          (acc[log.errorState.errorType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const last24Hours = this.logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      const now = Date.now();
      return now - logTime < 24 * 60 * 60 * 1000;
    }).length;

    const mostCommonEndpoint = this.getMostCommonEndpoint();

    return {
      total,
      byType,
      last24Hours,
      mostCommonEndpoint,
    };
  }

  /**
   * الحصول على أكثر endpoint تسبب في أخطاء
   */
  private getMostCommonEndpoint(): string | null {
    const endpoints = this.logs
      .map((log) => log.errorState.details?.endpoint)
      .filter(Boolean) as string[];

    if (endpoints.length === 0) return null;

    const counts = endpoints.reduce(
      (acc, endpoint) => {
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sorted.length > 0 ? sorted[0][0] : null;
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();

// تحميل السجلات عند البدء
errorLogger.loadFromLocalStorage();

export default errorLogger;
export type { ErrorLog };
