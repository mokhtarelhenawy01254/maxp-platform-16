import React from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
  show: boolean;
  unreadCount?: number;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  onClick,
  show,
  unreadCount = 0,
}) => {
  if (!show) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <button
        type="button"
        onClick={onClick}
        className="relative bg-card hover:bg-muted border border-border/80 rounded-full p-2.5 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 cursor-pointer text-foreground"
        title="التمرير للأسفل"
        aria-label="التمرير للأسفل"
      >
        <ChevronDown className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-mono font-bold tabular-nums shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

interface ScrollToTopButtonProps {
  onClick: () => void;
  show: boolean;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  onClick,
  show,
}) => {
  if (!show) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <button
        type="button"
        onClick={onClick}
        className="bg-card hover:bg-muted border border-border/80 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 cursor-pointer text-foreground"
        title="التمرير للأعلى"
        aria-label="التمرير للأعلى"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
};

interface NewMessageAlertProps {
  show: boolean;
  count: number;
  onClick: () => void;
}

export const NewMessageAlert: React.FC<NewMessageAlertProps> = ({
  show,
  count,
  onClick,
}) => {
  if (!show || count === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
      <button
        type="button"
        onClick={onClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-150 flex items-center gap-2 active:scale-95 text-xs font-semibold cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>
          {count === 1 ? "رسالة جديدة" : `${count} رسائل جديدة`}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface MessagesContainerProps {
  children: React.ReactNode;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const MessagesContainer: React.FC<MessagesContainerProps> = ({
  children,
  onScroll,
  containerRef,
  className = "",
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth messages-scroll ${className}`}
      style={{
        scrollBehavior: "smooth",
        scrollbarWidth: "thin",
      }}
    >
      {children}
    </div>
  );
};

interface TypingIndicatorProps {
  show: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  show,
  userName = "المستخدم",
}) => {
  if (!show) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-muted/70 border border-border/60 rounded-xl rounded-bl-none px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{userName} يكتب</span>
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
              <div
                className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <div
                className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isReconnecting = false,
}) => {
  if (isConnected && !isReconnecting) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div
        className={`text-center py-1.5 px-3 text-xs font-semibold border-b ${
          isReconnecting
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
        }`}
      >
        {isReconnecting ? (
          <div className="flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>جاري إعادة الاتصال بالخادم...</span>
          </div>
        ) : (
          <span>انقطع الاتصال الحي - يرجى فحص الشبكة</span>
        )}
      </div>
    </div>
  );
};
