import { useState, useCallback } from "react";
import errorLogger from "../utils/errorLogger";

export interface ErrorState {
  hasError: boolean;
  errorType: "network" | "server" | "auth" | "validation" | "unknown";
  errorMessage: string;
  errorCode?: string | number;
  canRetry: boolean;
  timestamp: number;
  // معلومات تفصيلية للمطورين
  details?: {
    endpoint?: string; // API endpoint
    method?: string; // HTTP method
    statusCode?: number; // HTTP status code
    requestData?: any; // البيانات المرسلة
    responseData?: any; // رد الخادم
    stackTrace?: string; // Stack trace للخطأ
    userMessage?: string; // رسالة مبسطة للمستخدم
  };
}

export interface UseErrorHandlerReturn {
  error: ErrorState | null;
  setError: (error: ErrorState | null) => void;
  clearError: () => void;
  handleError: (error: any) => void;
  isError: boolean;
}

const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<ErrorState | null>(null);

  const setError = useCallback((error: ErrorState | null) => {
    setErrorState(error);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const getErrorMessage = (error: any): string => {
    // استخراج رسالة الخطأ من الاستجابة
    const responseError = error?.response?.data?.error;
    const responseMessage = error?.response?.data?.message;
    const responseDetails = error?.response?.data?.details;

    // رسائل خطأ مخصصة باللغة العربية مع تفاصيل أكثر
    const errorMessages: Record<string, string> = {
      "Network Error": "⚠️ خطأ في الاتصال بالشبكة - تأكد من اتصالك بالإنترنت",
      timeout: "⏱️ انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى",
      "401": "🔒 انتهت صلاحية جلسة العمل - يرجى تسجيل الدخول مرة أخرى",
      "403": "🚫 ليس لديك صلاحية للوصول إلى هذا المحتوى",
      "404": "🔍 المحتوى المطلوب غير موجود",
      "500": "⚠️ خطأ داخلي في الخادم - يرجى المحاولة لاحقاً",
      "502": "⚠️ الخادم غير متاح حالياً - يرجى المحاولة لاحقاً",
      "503": "⚠️ الخدمة غير متاحة مؤقتاً - جاري العمل على حل المشكلة",
      "504": "⏱️ انتهت مهلة الاتصال بالخادم - حاول مرة أخرى",
    };

    // أولاً: محاولة الحصول على رسالة الخطأ من الاستجابة
    if (responseError) {
      if (typeof responseError === "object" && responseError.message) {
        return `⚠️ ${responseError.message}`;
      }
      if (typeof responseError === "string") {
        return `⚠️ ${responseError}`;
      }
    }

    if (responseMessage) {
      return `⚠️ ${responseMessage}`;
    }

    // ثانياً: إضافة التفاصيل إذا وُجدت
    if (responseDetails) {
      const detailsStr =
        typeof responseDetails === "string"
          ? responseDetails
          : JSON.stringify(responseDetails, null, 2);

      if (error?.response?.status) {
        const statusMsg = errorMessages[error.response.status.toString()];
        return `${statusMsg}\n\nالتفاصيل: ${detailsStr}`;
      }
      return `⚠️ خطأ: ${detailsStr}`;
    }

    // ثالثاً: استخدام رسائل الخطأ المخصصة حسب الحالة
    if (error?.response?.status) {
      const status = error.response.status;
      const defaultMsg = errorMessages[status.toString()];

      if (defaultMsg) {
        // إضافة معلومات إضافية للأخطاء 500+
        if (status >= 500) {
          const url = error?.config?.url || "";
          const method = error?.config?.method?.toUpperCase() || "";
          if (url) {
            const urlParts = url.split("/").filter(Boolean);
            const endpoint = urlParts[urlParts.length - 1] || "";
            return `${defaultMsg}\n\n📍 المسار: ${method} /${endpoint}`;
          }
        }
        return defaultMsg;
      }

      return `⚠️ خطأ (${status}) - حدث خطأ غير متوقع`;
    }

    // رابعاً: التحقق من رسالة الخطأ العامة
    if (error?.message) {
      return errorMessages[error.message] || `⚠️ ${error.message}`;
    }

    if (typeof error === "string") {
      return errorMessages[error] || `⚠️ ${error}`;
    }

    return "⚠️ حدث خطأ غير متوقع - يرجى المحاولة مرة أخرى";
  };

  // دالة لاستخراج التفاصيل التقنية للخطأ
  const getErrorDetails = (error: any) => {
    const config = error?.config;
    const response = error?.response;

    // استخراج endpoint
    let endpoint = config?.url || "";
    if (endpoint.startsWith("http")) {
      try {
        const url = new URL(endpoint);
        endpoint = url.pathname;
      } catch (e) {
        // keep original endpoint
      }
    }

    // استخراج method
    const method = config?.method?.toUpperCase() || "UNKNOWN";

    // استخراج status code
    const statusCode = response?.status;

    // استخراج request data (مع إخفاء البيانات الحساسة)
    let requestData = config?.data;
    if (requestData) {
      try {
        const parsed =
          typeof requestData === "string"
            ? JSON.parse(requestData)
            : requestData;
        // إخفاء كلمات المرور والتوكنات
        const sanitized = { ...parsed };
        ["password", "token", "secret", "apiKey"].forEach((key) => {
          if (sanitized[key]) sanitized[key] = "***";
        });
        requestData = sanitized;
      } catch (e) {
        requestData = "[Unable to parse]";
      }
    }

    // استخراج response data
    const responseData = response?.data;

    // استخراج stack trace
    const stackTrace = error?.stack || new Error().stack;

    // رسالة مبسطة للمستخدم
    let userMessage = "";
    if (statusCode) {
      if (statusCode >= 500) {
        userMessage = "حدث خطأ في الخادم";
      } else if (statusCode === 404) {
        userMessage = "العنصر المطلوب غير موجود";
      } else if (statusCode === 401) {
        userMessage = "يرجى تسجيل الدخول مرة أخرى";
      } else if (statusCode === 403) {
        userMessage = "ليس لديك صلاحية للقيام بهذا الإجراء";
      } else if (statusCode >= 400) {
        userMessage = "هناك مشكلة في البيانات المدخلة";
      }
    } else if (error?.message === "Network Error") {
      userMessage = "تحقق من اتصالك بالإنترنت";
    }

    return {
      endpoint,
      method,
      statusCode,
      requestData,
      responseData,
      stackTrace,
      userMessage,
    };
  };

  const getErrorType = (error: any): ErrorState["errorType"] => {
    if (error?.response?.status) {
      const status = error.response.status;
      if (status === 401 || status === 403) return "auth";
      if (status >= 400 && status < 500) return "validation";
      if (status >= 500) return "server";
    }

    if (error?.message === "Network Error" || error?.code === "NETWORK_ERROR") {
      return "network";
    }

    return "unknown";
  };

  const canRetry = (error: any): boolean => {
    const errorType = getErrorType(error);
    const status = error?.response?.status;

    // لا يمكن إعادة المحاولة في حالات المصادقة والتحقق
    if (errorType === "auth" || errorType === "validation") {
      return false;
    }

    // يمكن إعادة المحاولة في حالات الشبكة والخادم
    if (errorType === "network" || errorType === "server") {
      return true;
    }

    // حالات خاصة
    if (status === 404) return false; // المحتوى غير موجود
    if (status === 429) return true; // كثرة الطلبات

    return true;
  };

  const handleError = useCallback((error: any) => {
    console.error("Error handled:", error);

    const errorState: ErrorState = {
      hasError: true,
      errorType: getErrorType(error),
      errorMessage: getErrorMessage(error),
      errorCode: error?.response?.status || error?.code,
      canRetry: canRetry(error),
      timestamp: Date.now(),
      details: getErrorDetails(error), // إضافة التفاصيل التقنية
    };

    setErrorState(errorState);

    // تسجيل الخطأ في Error Logger
    errorLogger.log(errorState);

    // طباعة التفاصيل الكاملة في console للمطورين
    if (import.meta.env.DEV) {
      console.group("🔴 Error Details");
      console.log("Type:", errorState.errorType);
      console.log("Message:", errorState.errorMessage);
      console.log("Code:", errorState.errorCode);
      console.log("Endpoint:", errorState.details?.endpoint);
      console.log("Method:", errorState.details?.method);
      console.log("Request Data:", errorState.details?.requestData);
      console.log("Response Data:", errorState.details?.responseData);
      console.log("Stack Trace:", errorState.details?.stackTrace);
      console.groupEnd();
    }

    // إرسال الخطأ لخدمة التتبع (في المستقبل)
    if (import.meta.env.PROD) {
      // sendErrorToTracking(errorState);
    }
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError,
    isError: !!error?.hasError,
  };
};

export default useErrorHandler;
