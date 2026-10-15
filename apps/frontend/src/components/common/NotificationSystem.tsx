import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Bell,
} from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 250);
  }, [notification.id, onDismiss]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 50);

    if (!notification.persistent && notification.duration) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(dismissTimer);
      };
    }

    return () => clearTimeout(enterTimer);
  }, [notification.duration, notification.persistent, handleDismiss]);

  const getNotificationConfig = () => {
    switch (notification.type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
          border: "border-emerald-500/30",
        };
      case "error":
        return {
          icon: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
          border: "border-rose-500/30",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          border: "border-amber-500/30",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-4 h-4 text-primary shrink-0" />,
          border: "border-primary/30",
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <div
      className={`transform transition-all duration-200 ease-out mb-2.5 bg-card/95 backdrop-blur-md border ${
        config.border
      } rounded-xl shadow-xl p-3.5 max-w-sm w-full select-none ${
        isVisible && !isLeaving
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
      dir="rtl"
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-foreground mb-0.5">
            {notification.title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {notification.message}
          </p>
          {notification.action && (
            <button
              type="button"
              onClick={notification.action.onClick}
              className="mt-2 text-xs font-semibold text-primary hover:underline transition-colors"
            >
              {notification.action.label}
            </button>
          )}
          <div className="text-[10px] text-muted-foreground font-mono tabular-nums mt-1">
            {notification.timestamp.toLocaleTimeString("ar-EG")}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80 transition-colors active:scale-95"
          aria-label="إغلاق الإشعار"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface NotificationSystemProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  maxNotifications?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = "top-right",
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        duration: notification.duration || 5000,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        return updated.slice(0, maxNotifications);
      });
    },
    [maxNotifications],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    (window as any).showNotification = addNotification;
    (window as any).clearNotifications = clearAll;

    return () => {
      delete (window as any).showNotification;
      delete (window as any).clearNotifications;
    };
  }, [addNotification, clearAll]);

  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "top-4 right-4";
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "top-4 right-4";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50 pointer-events-none`}>
      <div className="pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
          />
        ))}
        {notifications.length > 1 && (
          <button
            type="button"
            onClick={clearAll}
            className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-colors"
          >
            مسح جميع الإشعارات ({notifications.length})
          </button>
        )}
      </div>
    </div>
  );
};

export const useNotifications = () => {
  const showSuccess = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      (window as any).showNotification?.({
        type: "success",
        title,
        message,
        ...options,
      });
    },
    [],
  );

  const showError = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      (window as any).showNotification?.({
        type: "error",
        title,
        message,
        persistent: true,
        ...options,
      });
    },
    [],
  );

  const showWarning = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      (window as any).showNotification?.({
        type: "warning",
        title,
        message,
        ...options,
      });
    },
    [],
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      (window as any).showNotification?.({
        type: "info",
        title,
        message,
        ...options,
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    (window as any).clearNotifications?.();
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};

export default NotificationSystem;
