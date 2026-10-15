import React, { useState } from "react";
import {
  Wifi,
  Server,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  X,
  Lightbulb,
  Link2,
  BarChart2,
  Upload,
  Download,
  Search,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { ErrorState } from "../../hooks/useErrorHandler";

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorConfig = (errorType: ErrorState["errorType"]) => {
    switch (errorType) {
      case "network":
        return {
          icon: Wifi,
          title: "مشكلة في الاتصال بالشبكة",
          border: "border-rose-500/30",
          iconColor: "text-rose-500",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        };
      case "server":
        return {
          icon: Server,
          title: "خطأ في استجابة الخادم",
          border: "border-rose-500/30",
          iconColor: "text-rose-500",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        };
      case "auth":
        return {
          icon: ShieldAlert,
          title: "مشكلة في المصادقة والصلاحيات",
          border: "border-amber-500/30",
          iconColor: "text-amber-500",
          badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
      case "validation":
        return {
          icon: AlertTriangle,
          title: "تنبيه في صحة البيانات المدخلة",
          border: "border-amber-500/30",
          iconColor: "text-amber-500",
          badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
      default:
        return {
          icon: AlertTriangle,
          title: "خطأ غير متوقع",
          border: "border-rose-500/30",
          iconColor: "text-rose-500",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        };
    }
  };

  const config = getErrorConfig(error.errorType);
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 bg-card border ${config.border} rounded-xl shadow-2xs`}
      >
        <div className="shrink-0">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{error.errorMessage}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {error.canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors active:scale-95"
              title="إعادة المحاولة"
              aria-label="إعادة المحاولة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors active:scale-95"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-card border ${config.border} p-5 shadow-sm space-y-4`}>
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 p-2.5 rounded-xl bg-muted/60 border border-border/70">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-1.5">
            {config.title}
          </h3>

          <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            {error.errorMessage.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>

          {error.details?.userMessage && (
            <div className="mt-3 flex items-start gap-2 text-xs text-foreground bg-muted/40 px-3 py-2.5 rounded-xl border border-border/70">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold text-foreground">إرشاد: </span>
                <span className="text-muted-foreground">{error.details.userMessage}</span>
              </div>
            </div>
          )}

          {error.errorCode && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/60">
              <span className="font-semibold text-foreground">كود الخطأ:</span>
              <span>{error.errorCode}</span>
            </div>
          )}

          {error.details &&
            (error.details.endpoint ||
              error.details.method ||
              error.details.statusCode) && (
              <div className="mt-4 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  {showDetails ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
                  )}
                  <span>
                    {showDetails
                      ? "إخفاء التفاصيل التقنية"
                      : "عرض التفاصيل التقنية للتشخيص"}
                  </span>
                </button>

                {showDetails && (
                  <div className="mt-3 bg-muted/70 text-foreground p-3.5 rounded-xl border border-border/70 text-xs font-mono space-y-2.5 max-h-80 overflow-auto">
                    {error.details.endpoint && (
                      <div className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">المسار:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold truncate">
                          {error.details.method} {error.details.endpoint}
                        </span>
                      </div>
                    )}

                    {error.details.statusCode && (
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">كود الاستجابة:</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                          {error.details.statusCode}
                        </span>
                      </div>
                    )}

                    {error.details.requestData && (
                      <div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>بيانات الطلب المرسلة:</span>
                        </div>
                        <pre className="p-2 rounded-lg bg-background/80 border border-border/60 text-foreground text-[11px] overflow-x-auto">
                          {JSON.stringify(error.details.requestData, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.details.responseData && (
                      <div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span>بيانات الرد المستلمة:</span>
                        </div>
                        <pre className="p-2 rounded-lg bg-background/80 border border-border/60 text-foreground text-[11px] overflow-x-auto">
                          {typeof error.details.responseData === "object"
                            ? JSON.stringify(error.details.responseData, null, 2)
                            : error.details.responseData}
                        </pre>
                      </div>
                    )}

                    {error.details.stackTrace &&
                      process.env["NODE_ENV"] === "development" && (
                        <div>
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span>تتبع المكدس (Stack Trace):</span>
                          </div>
                          <pre className="p-2 rounded-lg bg-background/80 border border-border/60 text-muted-foreground text-[10px] overflow-x-auto">
                            {error.details.stackTrace}
                          </pre>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

          <div className="flex items-center gap-2.5 mt-4">
            {error.canRetry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-border/70 text-xs font-medium rounded-lg text-muted-foreground bg-card hover:bg-muted hover:text-foreground active:scale-95 transition-all shadow-2xs"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const InlineError: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="flex items-center justify-center p-3 text-center">
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-primary hover:underline font-semibold text-xs ml-1"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
};

export const ErrorToast: React.FC<{
  error: ErrorState;
  onDismiss: () => void;
  onRetry?: () => void;
}> = ({ error, onDismiss, onRetry }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-50 max-w-sm w-full p-2">
      <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-xl border border-rose-500/30 p-3.5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">تنبيه بالنظام</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
              {error.errorMessage}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {error.canRetry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-semibold text-primary hover:underline px-1 py-0.5"
              >
                إعادة
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors active:scale-95"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
