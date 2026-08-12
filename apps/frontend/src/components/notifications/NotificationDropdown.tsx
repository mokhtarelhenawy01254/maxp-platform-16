import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import { buildApiUrl } from "../../utils/urlHelper";
import { tokenManager } from "../../utils/tokenManager";
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { BellIcon as BellSolidIcon } from "@heroicons/react/24/solid";
import { socketService } from "../../services/socketService";
import {
  showBrowserNotification,
} from "../../utils/browserNotifications";
import {
  cacheNotificationSettings,
  getOrderSoundVolume,
  isQuietHoursActive,
  readCachedNotificationSettings,
  shouldPlayOrderSound,
  shouldShowBrowserNotificationForType,
  type NotificationSettingsData,
} from "../../utils/notificationSettings";

export interface NotificationItem {
  id: string;
  type: "error" | "warning" | "info" | "success" | "invitation";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  silent?: boolean;
  customerId?: string;
  errorType?: string;
  metadata?: Record<string, unknown>;
  data?: {
    invitationId?: string;
    token?: string;
    companyName?: string;
    inviterName?: string;
    role?: string;
    expiresAt?: string;
    invitationLink?: string;
  };
}

interface NotificationDropdownProps {
  className?: string;
}

interface RealtimeNotificationPayload
  extends Partial<Omit<NotificationItem, "timestamp" | "type">> {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: string | Date;
  timestamp?: string | Date;
  read?: boolean;
}

interface OrderCreatedEventPayload {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  guestName?: string;
  customer?: {
    firstName?: string;
  };
  total?: number;
  totalAmount?: number;
  createdAt?: string | Date;
  metadata?: {
    orderNumber?: string;
  };
}

const normalizeNotificationItem = (
  notification: RealtimeNotificationPayload,
): NotificationItem => ({
  ...notification,
  timestamp: new Date(
    notification.createdAt || notification.timestamp || new Date(),
  ),
  isRead: notification.isRead ?? notification.read ?? false,
  type: (notification.type === "PERFORMANCE_REVIEW"
    ? "info"
    : (notification.type || "info")) as NotificationItem["type"],
});

const buildOrderNotificationItem = (
  order: OrderCreatedEventPayload,
): NotificationItem => {
  const orderNumber = order.orderNumber || order.id || "جديد";
  const customerName =
    order.customerName || order.guestName || order.customer?.firstName || "عميل";
  const amount =
    typeof order.total === "number"
      ? order.total
      : typeof order.totalAmount === "number"
        ? order.totalAmount
        : null;

  return {
    id: `order-${order.id || orderNumber}`,
    type: "info",
    title: `طلب جديد #${orderNumber}`,
    message:
      amount && amount > 0
        ? `${customerName} • ${amount} ج.م`
        : `تم استلام طلب جديد من ${customerName}`,
    timestamp: new Date(order.createdAt || new Date()),
    isRead: false,
    metadata: {
      kind: "order_created",
      orderId: order.id,
      orderNumber,
    },
  };
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className = "",
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationSettingsData | null>(() =>
      readCachedNotificationSettings(),
    );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationPreferencesRef = useRef<NotificationSettingsData | null>(
    notificationPreferences,
  );

  const getToken = () => tokenManager.getAccessToken();

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  // إغلاق الـ dropdown عند الضغط خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // تحديث عدد الإشعارات غير المقروءة
  useEffect(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  const syncNotificationPreferences = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      return;
    }

    try {
      const response = await apiClient.get(`/notifications/settings/${user.id}`);
      if (response.data?.success && response.data?.data) {
        const nextPreferences = response.data.data as NotificationSettingsData;
        setNotificationPreferences(nextPreferences);
        cacheNotificationSettings(nextPreferences);
      }
    } catch (error) {
      const cachedPreferences = readCachedNotificationSettings();
      if (cachedPreferences) {
        setNotificationPreferences(cachedPreferences);
      }
    }
  }, [isAuthenticated, user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !isAuthenticated) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl("notifications/recent"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setNotifications(
          Array.isArray(data.notifications)
            ? data.notifications.map(normalizeNotificationItem)
            : [],
        );
      } else if (response.status === 401) {
        setNotifications([]);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      setNotifications([]);
    }
  }, [isAuthenticated, user]);

  // جلب الإشعارات من الـ API - optimized with Page Visibility API
  useEffect(() => {
    fetchNotifications();
    syncNotificationPreferences();

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
        syncNotificationPreferences();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh every 30 seconds (only when visible)
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
        syncNotificationPreferences();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, syncNotificationPreferences]);

  // استماع لإشعارات السوكيت اللحظية
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    socketService.getSocket();

    const handleSettingsUpdated = () => {
      setNotificationPreferences(readCachedNotificationSettings());
    };

    const handleNewNotification = (notification: RealtimeNotificationPayload) => {
      console.log("🔔 [REALTIME] New notification received:", notification);

      const newNotification = normalizeNotificationItem(notification);

      setNotifications((prev) => [newNotification, ...prev]);

      socketService.playNotificationSound();

      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: newNotification.message,
            type: notification.type === "error" ? "error" : "info",
          },
        }),
      );
    };

    const handleNewOrder = (order: OrderCreatedEventPayload) => {
      const orderNotification = buildOrderNotificationItem(order);

      // 🔊 إنذار صوتي عالي لتنبيه الموظفين بقدوم طلب جديد
      try {
        const currentPreferences = notificationPreferencesRef.current;
        if (shouldPlayOrderSound(currentPreferences)) {
          socketService.playOrderAlarm({
            volume: getOrderSoundVolume(currentPreferences),
            pattern: currentPreferences?.channels?.sound?.pattern || "cash",
          });
        }
      } catch (soundError) {
        console.error("❌ [SOUND] Error playing order alarm:", soundError);
      }

      setNotifications((prev) => {
        const deduped = prev.filter(
          (currentNotification) => currentNotification.id !== orderNotification.id,
        );
        return [orderNotification, ...deduped];
      });

      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: orderNotification.title,
            type: "info",
          },
        }),
      );

      const currentPreferences = notificationPreferencesRef.current;
      if (
        !currentPreferences ||
        isQuietHoursActive(currentPreferences) ||
        !shouldShowBrowserNotificationForType(
          currentPreferences,
          "order_created",
        )
      ) {
        return;
      }

      const shouldIncludePreview =
        currentPreferences.channels.browser.showPreview !== false;
      const body = shouldIncludePreview
        ? orderNotification.message
        : "تم استلام طلب جديد";

      showBrowserNotification({
        title: orderNotification.title,
        body,
        tag: `order-created-${order.metadata?.orderNumber || order.id || Date.now()}`,
        requireInteraction:
          currentPreferences.channels.browser.requireInteraction ?? false,
        onClick: () => {
          const orderNumber =
            orderNotification.metadata?.orderNumber || order.orderNumber;
          window.location.href = orderNumber
            ? `/orders?search=${orderNumber}`
            : "/orders";
        },
      });
    };

    socketService.on("notification:new", handleNewNotification);
    socketService.on("order:created", handleNewOrder);
    window.addEventListener(
      "notification-settings:updated",
      handleSettingsUpdated,
    );

    return () => {
      socketService.off("notification:new", handleNewNotification);
      socketService.off("order:created", handleNewOrder);
      window.removeEventListener(
        "notification-settings:updated",
        handleSettingsUpdated,
      );
    };
  }, [isAuthenticated, user]);

  const markAsRead = async (notificationId: string) => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl(`notifications/${notificationId}/read`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl("notifications/mark-all-read"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user || !isAuthenticated) return;

    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl(`notifications/${notificationId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleAcceptInvitation = (notification: NotificationItem) => {
    if (notification.data?.invitationLink) {
      window.location.href = notification.data.invitationLink;
    }
  };

  const handleDeclineInvitation = async (notification: NotificationItem) => {
    // Just mark as read and delete
    await markAsRead(notification.id);
    await deleteNotification(notification.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case "success":
        return <CheckIcon className="w-5 h-5 text-green-500" />;
      case "invitation":
        return <span className="text-2xl">🎉</span>;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  // إخفاء الجرس إذا لم يكن المستخدم مسجل دخول
  if (!user) {
    return null;
  }

  return (
    <div className={`business-shell-notification relative ${className}`.trim()} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="business-icon-button business-shell-utility-button business-shell-notification-button relative"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-5 w-5 text-orange-500" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {/* Badge للعدد */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute ltr:right-0 rtl:left-0 z-50 mt-2 max-h-96 w-96 max-w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
              <div className="flex items-center space-x-2 space-x-reverse">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}
                          >
                            {notification.title}
                            {notification.silent && (
                              <span className="mr-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                صامت
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Invitation Action Buttons */}
                          {notification.type === "invitation" &&
                            notification.data && (
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() =>
                                    handleAcceptInvitation(notification)
                                  }
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-sm"
                                >
                                  ✅ قبول الدعوة
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeclineInvitation(notification)
                                  }
                                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
                                >
                                  ❌ رفض
                                </button>
                              </div>
                            )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {notification.customerId && (
                              <span className="text-xs text-gray-500">
                                العميل: {notification.customerId.slice(-8)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 space-x-reverse mr-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                              title="تحديد كمقروء"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="حذف"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page
                  window.location.href = "/notifications";
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
