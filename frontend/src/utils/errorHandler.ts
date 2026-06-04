/**
 * 🛡️ Error Handling Utilities
 * Centralized error handling with context-aware error boundaries
 */

import i18n from "../i18n";

// Type definitions
type ErrorSeverity = "info" | "warning" | "error" | "critical";
type ErrorCategory =
  | "network"
  | "validation"
  | "authentication"
  | "authorization"
  | "database"
  | "external_service"
  | "rate_limit"
  | "timeout"
  | "unknown"
  | "client_error"
  | "server_error";

interface ErrorContext {
  componentStack: string;
  userId: string | null;
  companyId: string | null;
  requestId: string | null;
  timestamp: number;
}

// Error context for tracking
let globalErrorContext: ErrorContext = {
  componentStack: "",
  userId: null,
  companyId: null,
  requestId: null,
  timestamp: Date.now(),
};

/**
 * Set global error context
 */
export function setErrorContext(context: Partial<ErrorContext>): void {
  globalErrorContext = { ...globalErrorContext, ...context };
}

/**
 * Clear error context
 */
export function clearErrorContext(): void {
  globalErrorContext = {
    componentStack: "",
    userId: null,
    companyId: null,
    requestId: null,
    timestamp: Date.now(),
  };
}

/**
 * Custom error class with context
 */
export class AppError extends Error {
  context: ErrorContext;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code: string;
  recoverable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      recoverable?: boolean;
      context?: Partial<ErrorContext>;
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = options.code || "UNKNOWN_ERROR";
    this.severity = options.severity || "error";
    this.category = options.category || "unknown";
    this.recoverable = options.recoverable ?? true;
    this.context = { ...globalErrorContext, ...options.context };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Error categories for better handling
 */
export const ERROR_CATEGORIES = {
  NETWORK: "network" as ErrorCategory,
  VALIDATION: "validation" as ErrorCategory,
  AUTHENTICATION: "authentication" as ErrorCategory,
  AUTHORIZATION: "authorization" as ErrorCategory,
  DATABASE: "database" as ErrorCategory,
  EXTERNAL_SERVICE: "external_service" as ErrorCategory,
  RATE_LIMIT: "rate_limit" as ErrorCategory,
  TIMEOUT: "timeout" as ErrorCategory,
  UNKNOWN: "unknown" as ErrorCategory,
} as const;

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  INFO: "info" as ErrorSeverity,
  WARNING: "warning" as ErrorSeverity,
  ERROR: "error" as ErrorSeverity,
  CRITICAL: "critical" as ErrorSeverity,
} as const;

/**
 * Common error codes
 */
export const ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SERVER_ERROR: "SERVER_ERROR",
  WOO_COMMERCE_API_ERROR: "WOO_COMMERCE_API_ERROR",
  IMPORT_FAILED: "IMPORT_FAILED",
} as const;

/**
 * Map HTTP status codes to error categories
 */
export function getErrorCategoryFromStatus(status: number): ErrorCategory {
  if (status >= 400 && status < 500) {
    if (status === 401) return "authentication";
    if (status === 403) return "authorization";
    if (status === 404) return "unknown";
    if (status === 422) return "validation";
    if (status === 429) return "rate_limit";
    return "client_error" as ErrorCategory;
  }
  if (status >= 500) {
    return "server_error" as ErrorCategory;
  }
  return "unknown" as ErrorCategory;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.recoverable;
  }

  if (error instanceof TypeError) {
    return false; // Type errors usually indicate bugs
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch")) {
      return true;
    }
    if (message.includes("timeout")) {
      return true;
    }
  }

  return true;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.category) {
      case "network":
        return i18n.t("errorHandler.network");
      case "authentication":
        return i18n.t("errorHandler.authentication");
      case "rate_limit":
        return i18n.t("errorHandler.rate_limit");
      case "timeout":
        return i18n.t("errorHandler.timeout");
      case "validation":
        return i18n.t("errorHandler.validation");
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return i18n.t("errorHandler.fetch_failed");
    }
    if (error.message.includes("timeout")) {
      return i18n.t("errorHandler.timeout_error");
    }
  }

  return i18n.t("errorHandler.generic");
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context?: Partial<ErrorContext>,
): void {
  const errorContext = { ...globalErrorContext, ...context };

  console.error("═══════════════════════════════════════");
  console.error("🔴 ERROR LOG");
  console.error("═══════════════════════════════════════");
  console.error(
    "Message:",
    error instanceof Error ? error.message : String(error),
  );
  console.error("Context:", JSON.stringify(errorContext, null, 2));
  console.error("Stack:", error instanceof Error ? error.stack : "N/A");
  console.error("═══════════════════════════════════════");
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryCondition?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryCondition = isRecoverableError,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay,
      );

      if (onRetry) {
        onRetry(error, attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create error boundary component helper
 */
export function createErrorBoundaryInfo(error: Error, resetError: () => void) {
  return {
    error,
    resetError,
    errorMessage: error.message,
    errorName: error.name,
    isRecoverable: isRecoverableError(error),
    userMessage: getUserFriendlyMessage(error),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Safe async function wrapper with error handling
 */
export function safeAsync<T>(
  promise: Promise<T>,
  errorHandler?: (error: unknown) => T,
): Promise<T> {
  return promise.catch(
    errorHandler ||
      ((error) => {
        logError(error);
        throw error;
      }),
  );
}

/**
 * Format error for API response
 */
export function formatErrorForAPI(error: unknown): object {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        recoverable: error.recoverable,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      recoverable: isRecoverableError(error),
    },
  };
}
