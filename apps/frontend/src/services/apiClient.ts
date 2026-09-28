import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { toast } from "sonner";
import { config } from "../config";
import { tokenManager } from "../utils/tokenManager";
import { repairMojibakeText } from "../utils/textEncoding";
import {
  refreshSessionTokens,
  shouldClearSessionOnRefreshFailure,
} from "../utils/sessionRefresh";
import { isCapacitorNative } from "../config/environment";
import { getDeviceFingerprint } from "../utils/deviceFingerprint";

/**
 * API Client
 *
 * Centralized HTTP client with interceptors for authentication,
 * error handling, and request/response transformation
 */

interface ApiError {
  success: false;
  error:
    | string
    | {
        code: string;
        message: string;
        details?: unknown;
      };
  geofenceData?: {
    distance: number;
    allowedRadius: number;
    isWithin: boolean;
  };
  details?: unknown;
  message?: string;
}

interface DebugWindow extends Window {
  debugApi?: boolean;
  debug?: boolean;
}

export type ApiRequestConfig = AxiosRequestConfig & {
  _skipErrorToast?: boolean;
  _skipAuthHeader?: boolean;
  _skipAuthRefresh?: boolean;
  _retry?: boolean;
  _retryCount?: number;
  _transientRetryCount?: number;
  _skipTransientRetry?: boolean;
  _companyId?: string;
};

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private readonly transientRetryDelaysMs = [250, 600, 1200];
  private failedQueue: Array<{
    resolve: (value: string | null) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      withCredentials: true,
      headers: {
        // DO NOT set Content-Type here. Axios auto-detects the right
        // Content-Type per request: application/json for plain objects,
        // multipart/form-data with the boundary for FormData, etc.
        // Setting it to "application/json" here used to silently
        // override the multipart boundary, which made every dental-lab
        // attachment upload from the UI fail with 400 "لم يتم رفع أي ملف".
        // The Accept header is fine as a default — most responses are JSON.
        Accept: "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Normalize URL to handle inconsistent path styles in components
        if (config.url) {
          // 1. Remove leading slash if it exists
          if (config.url.startsWith("/")) {
            config.url = config.url.substring(1);
          }
          // 2. Remove redundant api/v1/ or v1/ prefix if present (since it's now in baseURL)
          if (config.url.startsWith("api/v1/")) {
            config.url = config.url.substring(7);
          } else if (config.url.startsWith("v1/")) {
            config.url = config.url.substring(3);
          }
        }

        // Add auth token to requests
        const token = tokenManager.getAccessToken();
        const shouldDebugApiLogs =
          import.meta.env.DEV &&
          typeof window !== "undefined" &&
          (() => {
            const debugWindow = window as DebugWindow;
            return (
              debugWindow.debugApi === true || debugWindow.debug === true
            );
          })();

        if (shouldDebugApiLogs) {
          console.debug(
            "🔐 [API] Token from tokenManager:",
            token ? "exists" : "none",
            "length:",
            token?.length,
          );
        }
        if (token && !config._skipAuthHeader) {
          config.headers.Authorization = `Bearer ${token}`;
          if (shouldDebugApiLogs) {
            console.debug("🔐 [API] Using real token");
          }
        }

        // Send X-Platform: capacitor header on native mobile clients for extended sessions
        if (isCapacitorNative()) {
          config.headers["X-Platform"] = "capacitor";
        }

        // 🖥️ [DEVICE-ISOLATION] Send persistent client fingerprint
        const deviceFingerprint = getDeviceFingerprint();
        if (deviceFingerprint) {
          config.headers["X-Device-Fingerprint"] = deviceFingerprint;
        }

        // When sending FormData, delete any manually passed Content-Type header
        // so the browser automatically sets 'multipart/form-data; boundary=----...'
        // Explicitly passing 'Content-Type: multipart/form-data' strips the boundary,
        // which causes backend multipart parsers (multer) to reject uploads.
        if (typeof FormData !== "undefined" && config.data instanceof FormData) {
          if (config.headers) {
            delete config.headers["Content-Type"];
            delete config.headers["content-type"];
          }
        }

        // Add subdomain to headers for company isolation (from current URL)
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        if (hostname) {
          const parts = hostname.split(".");
          let subdomain = "";
          const isIpAddress = parts.length === 4 && parts.every((part) => /^\d+$/.test(part));

          // 1. Check for maxp.online or mokhtarelhenawy.online subdomains
          if (!isIpAddress && parts && parts.length >= 3 && parts[0] !== "www") {
            const potentialSubdomain = parts[0]?.toLowerCase();
            const reservedSubdomains = [
              "app",
              "admin",
              "api",
              "www",
              "dev",
              "staging",
              "mail",
            ];

            if (potentialSubdomain && !reservedSubdomains.includes(potentialSubdomain)) {
              subdomain = potentialSubdomain;
            }
          }
          // 2. Handle development subdomains (e.g., company.localhost)
          else if (
            import.meta.env.DEV &&
            parts.length >= 2 &&
            hostname.includes("localhost")
          ) {
            subdomain = parts[0] || "";
          }

          if (subdomain) {
            config.headers["X-Company-Subdomain"] = subdomain;
            config.headers["X-Subdomain"] = subdomain;
            config.headers["X-Company-Slug"] = subdomain;
          }
        }

        if (config._companyId) {
          config.headers["X-Company-Id"] = config._companyId;
        } else {
          let resolvedCompanyId: string | null = null;
          // 1. Read companyId from JWT token
          try {
            const token = tokenManager.getAccessToken();
            if (token) {
              const payload = JSON.parse(atob(token.split(".")[1]));
              if (payload?.companyId) {
                resolvedCompanyId = payload.companyId;
              }
            }
          } catch {
            // Token decode failed silently
          }

          // 2. Fallback for SuperAdmin / switched tenant context where JWT has companyId=null
          if (!resolvedCompanyId && typeof window !== "undefined") {
            try {
              const rawUser = localStorage.getItem("user");
              if (rawUser) {
                const parsedUser = JSON.parse(rawUser);
                if (parsedUser?.companyId) {
                  resolvedCompanyId = parsedUser.companyId;
                } else if (parsedUser?.company?.id) {
                  resolvedCompanyId = parsedUser.company.id;
                }
              }
              if (!resolvedCompanyId) {
                resolvedCompanyId =
                  localStorage.getItem("currentCompanyId") ||
                  localStorage.getItem("companyId") ||
                  sessionStorage.getItem("currentCompanyId") ||
                  null;
              }
            } catch {
              // ignore
            }
          }

          if (resolvedCompanyId) {
            config.headers["X-Company-Id"] = resolvedCompanyId;
          }
        }

        // Add request ID for tracking
        config.headers["X-Request-ID"] = this.generateRequestId();

        // Log request in development
        // if (import.meta.env.DEV) {
        //   console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        //     data: config.data,
        //     params: config.params,
        //   });
        // }

        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        // if (import.meta.env.DEV) {
        //   console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        //     status: response.status,
        //     data: response.data,
        //   });
        // }

        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as ApiRequestConfig;

        if (this.shouldRetryTransientError(error, originalRequest)) {
          const retryCount = originalRequest._transientRetryCount || 0;
          originalRequest._transientRetryCount = retryCount + 1;
          const delay =
            this.transientRetryDelaysMs[retryCount] ||
            this.transientRetryDelaysMs[this.transientRetryDelaysMs.length - 1]!;

          if (import.meta.env.DEV) {
            console.warn(
              `🔄 [API] Retrying transient ${originalRequest.method?.toUpperCase()} ${originalRequest.url} after ${delay}ms`,
              {
                status: error.response?.status,
                reason: this.extractErrorText(error),
              },
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client(originalRequest);
        }

        // Enhanced error logging in development
        if (import.meta.env.DEV) {
          // Skip logging 404 errors for expected fallback scenarios (e.g., trying simple order before enhanced)
          const isExpected404 =
            error.response?.status === 404 &&
            (
              originalRequest?._skipErrorToast ||
              originalRequest?.url?.includes("/orders-new/simple/") ||
              originalRequest?.url?.includes("homepage/public/") &&
              originalRequest?.url?.includes("/page/")
            );

          if (!isExpected404) {
            console.error(
              `❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
              {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                headers: originalRequest?.headers,
              },
            );
          } else {
            // Log as debug info instead of error for expected 404s
            console.debug(
              `ℹ️ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - 404 (expected, will try fallback)`,
            );
          }

          // Handle specific error cases with detailed logging
          if (error.response?.status === 401) {
            console.error(
              "🔒 Authentication failed - token may be invalid or expired",
            );
          } else if (error.response?.status === 403) {
            // Check if it's a geofencing error (don't logout for geofencing)
            if (error.response?.data?.geofenceData) {
              console.warn("📍 Geofencing restriction:", error.response.data);
            } else {
              console.error("🚫 Access denied - insufficient permissions");
              console.error(
                "SERVER RESPONSE:",
                JSON.stringify(error.response.data),
              );
              // ✅ REMOVED: Do NOT force logout on 403. Permission issues should not clear the session.
              // this.handleAuthError();
            }
          } else if (error.response?.status === 503) {
            console.error("⏳ Database temporarily unavailable - will retry");
          } else if (error.response?.status === 500) {
            console.error("🔥 Server error occurred");
            console.error("🔥 Error details:", error.response?.data);
            if (error.response?.data?.details) {
              console.error(
                "🔥 Error details (dev):",
                error.response.data.details,
              );
            }
          }
        }

        // Handle 503 Service Unavailable (database connection issues) with retry
        if (error.response?.status === 503) {
          const retryCount = originalRequest._retryCount || 0;
          const maxRetries = 3;

          if (retryCount < maxRetries) {
            originalRequest._retryCount = retryCount + 1;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)

            console.log(
              `🔄 Retrying request (${retryCount + 1}/${maxRetries}) after ${delay}ms...`,
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client(originalRequest);
          }
        }

        // Handle 401 Unauthorized
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest._skipAuthRefresh
        ) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshResult = await refreshSessionTokens();
            if (!refreshResult.ok) {
              const refreshError = Object.assign(
                new Error(refreshResult.message || "Session refresh failed"),
                {
                  status: refreshResult.status,
                  reason: refreshResult.reason,
                },
              );

              this.processQueue(refreshError, null);

              if (shouldClearSessionOnRefreshFailure(refreshResult)) {
                this.handleAuthError();
              } else if (import.meta.env.DEV) {
                console.warn(
                  "⏳ [API] Session refresh failed temporarily; preserving current auth state",
                  refreshResult,
                );
              }

              return Promise.reject(refreshError);
            }

            // Process failed queue
            this.processQueue(null, refreshResult.accessToken);

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        this.handleError(error);
        return Promise.reject(error);
      },
    );
  }

  private processQueue(error: unknown, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleAuthError(): void {
    const currentPath = window.location.pathname;
    const isPublicRoute =
      currentPath === "/" ||
      currentPath.startsWith("/test-public") ||
      currentPath.startsWith("/home") ||
      currentPath.startsWith("/shop") ||
      currentPath.startsWith("/product") ||
      currentPath.startsWith("/store") ||
      currentPath.startsWith("/cart") ||
      currentPath.startsWith("/checkout") ||
      currentPath.startsWith("/thank-you") ||
      currentPath.startsWith("/categories") ||
      currentPath.startsWith("/collections") ||
      currentPath.startsWith("/sale") ||
      currentPath.startsWith("/auth/") ||
      currentPath.startsWith("/register/") ||
      currentPath.startsWith("/affiliate-register") ||
      currentPath.startsWith("/apply/") ||
      currentPath.startsWith("/payment/") ||
      currentPath.startsWith("/account/") ||
      currentPath.startsWith("/account");

    if (isPublicRoute) {
      return;
    }

    // Do not clear tokens or force logout if network is disconnected or offline
    if (
      typeof window !== "undefined" &&
      typeof window.navigator !== "undefined" &&
      !window.navigator.onLine
    ) {
      if (import.meta.env.DEV) {
        console.warn("⏳ [API] Device is offline; preserving session tokens");
      }
      return;
    }

    // Clear tokens only for protected app routes.
    tokenManager.clearTokens();
    localStorage.removeItem("user");

    // Dispatch auth error event
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    window.location.href = "/auth/login";
  }

  private extractErrorText(error: AxiosError<ApiError>): string {
    const errorData = error.response?.data;
    const errorField =
      typeof errorData?.error === "object" && errorData?.error !== null
        ? repairMojibakeText(errorData.error.message)
        : typeof errorData?.error === "string"
          ? repairMojibakeText(errorData.error)
          : "";
    const messageField =
      typeof errorData?.message === "string"
        ? repairMojibakeText(errorData.message)
        : "";

    return `${messageField} ${errorField} ${error.message || ""}`.trim();
  }

  private shouldRetryTransientError(
    error: AxiosError<ApiError>,
    request?: ApiRequestConfig,
  ): boolean {
    if (!request || request._skipTransientRetry) {
      return false;
    }

    const method = String(request.method || "get").toUpperCase();
    if (!["GET", "HEAD", "PUT", "DELETE"].includes(method)) {
      return false;
    }

    const retryCount = request._transientRetryCount || 0;
    if (retryCount >= this.transientRetryDelaysMs.length) {
      return false;
    }

    const status = error.response?.status;
    if (status === 503) {
      return true;
    }

    if (status !== 500) {
      return false;
    }

    const errorText = this.extractErrorText(error);
    return [
      "Engine is not yet connected",
      "Response from the Engine was empty",
      "Failed to load storefront settings",
      "database temporarily unavailable",
      "timeout",
      "ECONNRESET",
      "ETIMEDOUT",
    ].some((pattern) => errorText.includes(pattern));
  }

  private handleError(error: AxiosError<ApiError>): void {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const originalRequest = error.config as ApiRequestConfig;
    const requestPath =
      originalRequest?.url?.split("?")[0]?.replace(/[^a-zA-Z0-9_-]/g, "-") ||
      "request";
    const toastId =
      status == null
        ? "api-network-error"
        : status >= 500
          ? "api-server-error"
          : `api-${status}-${requestPath}`;

    // Don't show toast for certain errors (503 is retried automatically)
    const silentErrors = [401, 404, 503];
    if (silentErrors.includes(status || 0)) {
      return;
    }

    // Don't show toast if explicitly skipped (e.g., for markAsRead timeouts)
    if (originalRequest._skipErrorToast) {
      return;
    }

    // 2026 Resiliency: Don't show disruptive error toasts for timeout on background counter & poll endpoints
    const isBackgroundPollUrl =
      originalRequest.url?.includes("/unread") ||
      originalRequest.url?.includes("/new-count") ||
      originalRequest.url?.includes("/whatsapp/messages/read") ||
      originalRequest.url?.includes("/analytics/realtime");

    if (
      (error.code === "ECONNABORTED" || error.message?.includes("timeout")) &&
      isBackgroundPollUrl
    ) {
      return;
    }

    // Show error toast - check both error.message and message (backend sends message directly)
    const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
    const errorMessage =
      typeof errorData?.error === "object" && errorData?.error !== null
        ? repairMojibakeText(errorData.error.message)
        : typeof errorData?.error === "string"
          ? repairMojibakeText(errorData.error)
          : errorData?.message
            ? repairMojibakeText(errorData.message)
            : isTimeout
              ? "استغرقت العملية وقتاً أطول من المتوقع، يرجى المحاولة مرة أخرى أو مراجعة الاتصال"
              : repairMojibakeText(error.message, "حدث خطأ غير متوقع");

    // استخراج تفاصيل إضافية للخطأ
    const errorDetails = errorData?.details;
    const errorCode =
      typeof errorData?.error === "object" && errorData?.error !== null
        ? errorData.error.code
        : null;

    // بناء رسالة خطأ أكثر تفصيلاً
    let detailedMessage = "";

    if (status && status >= 500) {
      const url = originalRequest.url || "";
      // استخراج اسم الصفحة أو العملية من الـ URL
      const urlPath = url.split("/").filter(Boolean);
      const operation = urlPath[urlPath.length - 1] || "العملية";

      // تحديد نوع العملية بناءً على الـ method
      const method = originalRequest.method?.toUpperCase();
      let operationName = "";
      switch (method) {
        case "GET":
          operationName = "جلب البيانات";
          break;
        case "POST":
          operationName = "إضافة البيانات";
          break;
        case "PUT":
        case "PATCH":
          operationName = "تحديث البيانات";
          break;
        case "DELETE":
          operationName = "حذف البيانات";
          break;
        default:
          operationName = "العملية";
      }

      // بناء رسالة واضحة
      if (errorMessage && errorMessage !== "حدث خطأ غير متوقع") {
        detailedMessage = `⚠️ خطأ في ${operationName}: ${errorMessage}`;
      } else if (errorCode) {
        detailedMessage = `⚠️ خطأ في الخادم (${errorCode}): فشل في ${operationName}`;
      } else if (errorDetails) {
        const detailsStr =
          typeof errorDetails === "string"
            ? repairMojibakeText(errorDetails, errorDetails)
            : JSON.stringify(errorDetails);
        detailedMessage = `⚠️ خطأ في الخادم: ${detailsStr}`;
      } else {
        // رسالة أكثر وضوحاً حسب حالة الخطأ
        switch (status) {
          case 500:
            detailedMessage = `⚠️ خطأ داخلي في الخادم - فشل في ${operationName} (${operation})`;
            break;
          case 502:
            detailedMessage = `⚠️ الخادم غير متاح حالياً - تعذر ${operationName}`;
            break;
          case 503:
            detailedMessage = `⚠️ الخدمة غير متاحة مؤقتاً`;
            break;
          case 504:
            detailedMessage = `⚠️ انتهت مهلة الاتصال بالخادم - حاول مرة أخرى`;
            break;
          default:
            detailedMessage = `⚠️ خطأ في الخادم (${status}) - فشل في ${operationName}`;
        }
      }

      // إضافة رمز الخطأ إذا وُجد
      if (status) {
        console.error(`[خطأ ${status}] ${detailedMessage}`, {
          url,
          errorData,
          errorDetails,
        });
      }

      toast.error(detailedMessage, { id: toastId });
    } else {
      // للأخطاء غير الخادم (400-499)
      if (errorMessage) {
        toast.error(`⚠️ ${errorMessage}`, { id: toastId });
      } else {
        toast.error("⚠️ حدث خطأ غير متوقع", { id: toastId });
      }
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // HTTP methods
  async get<T = unknown>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = unknown>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // File upload
  async upload<T = unknown>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    return this.client.post<T>(url, formData, {
      headers: {
        // boundary set by browser
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });
  }

  // Download file
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Cancel request
  createCancelToken() {
    return axios.CancelToken.source();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
