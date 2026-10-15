import React from "react";
import { Loader2, RotateCw } from "lucide-react";

export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-border/60">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 p-3.5 animate-pulse">
          <div className="w-10 h-10 bg-muted/80 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 bg-muted/80 rounded-md w-1/3" />
              <div className="h-3 bg-muted/60 rounded-md w-12 font-mono" />
            </div>
            <div className="h-3 bg-muted/60 rounded-md w-2/3" />
          </div>
          <div className="w-2.5 h-2.5 bg-muted/60 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[...Array(6)].map((_, index) => {
        const isSelf = index % 3 === 0;
        return (
          <div
            key={index}
            className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
          >
            <div className="animate-pulse space-y-1.5 max-w-xs sm:max-w-md w-full">
              <div
                className={`p-3 rounded-2xl border ${
                  isSelf
                    ? "bg-primary/10 border-primary/20 rounded-br-none ml-auto"
                    : "bg-muted/60 border-border/60 rounded-bl-none mr-auto"
                }`}
              >
                <div className="h-3.5 bg-muted/80 rounded-md w-full mb-1.5" />
                <div className={`h-3 bg-muted/60 rounded-md ${index % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
              </div>
              <div className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                <div className="h-2.5 bg-muted/40 rounded w-12" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "muted" | "white";
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  text,
}) => {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const colorClasses = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    white: "text-white",
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin shrink-0`}
      />
      {text && <span className={`text-xs font-medium ${colorClasses[color]}`}>{text}</span>}
    </div>
  );
};

interface RetryIndicatorProps {
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export const RetryIndicator: React.FC<RetryIndicatorProps> = ({
  retryCount,
  maxRetries,
  isRetrying,
}) => {
  if (!isRetrying && retryCount === 0) return null;

  return (
    <div className="flex items-center justify-center p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-700 dark:text-amber-300">
      <div className="flex items-center gap-2.5">
        <RotateCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
        <div className="text-xs leading-normal">
          <p className="font-semibold">
            جاري إعادة المحاولة... <span className="font-mono tabular-nums">({retryCount}/{maxRetries})</span>
          </p>
          <p className="text-[11px] opacity-80 mt-0.5">يرجى الانتظار قليلاً</p>
        </div>
      </div>
    </div>
  );
};

interface SendingIndicatorProps {
  isSending: boolean;
}

export const SendingIndicator: React.FC<SendingIndicatorProps> = ({
  isSending,
}) => {
  if (!isSending) return null;

  return (
    <div className="flex items-center justify-center p-1.5">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>جاري الإرسال...</span>
      </div>
    </div>
  );
};

interface InitialLoadingProps {
  message?: string;
}

export const InitialLoading: React.FC<InitialLoadingProps> = ({
  message = "جاري تحميل المحتوى...",
}) => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[300px] p-6">
      <div className="text-center space-y-2.5">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">{message}</h3>
        <p className="text-xs text-muted-foreground">يرجى الانتظار لحظات...</p>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm space-y-3 bg-card border border-border/70 rounded-2xl p-6 shadow-2xs">
        {icon && <div className="flex justify-center text-muted-foreground">{icon}</div>}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {action && (
          <div className="pt-2">
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-2xs"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
