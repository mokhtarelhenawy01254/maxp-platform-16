import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { useAuth } from "../hooks/useAuthSimple";
import { socketService } from "../services/socketService";
import { toast } from "sonner";
import {
  BellIcon,
  CheckIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { BellIcon as BellSolidIcon } from "@heroicons/react/24/solid";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  silent?: boolean;
  customerId?: string;
  errorType?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  severity?: "low" | "medium" | "high" | "critical";
  source?: "system";
}

const normalizeNotification = (n: any): NotificationItem => {
  const rawDate = n.createdAt || n.timestamp || n.date;
  const parsedDate = rawDate ? new Date(rawDate) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  let parsedData = n.data;
  if (typeof parsedData === "string") {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      parsedData = { raw: parsedData };
    }
  }

  const rawType = String(n.type || "info").toLowerCase();

  return {
    id: String(n.id || Math.random().toString(36).substring(2, 9)),
    type: rawType,
    title: n.title || "إشعار جديد",
    message: n.message || "",
    timestamp: validDate,
    isRead: Boolean(n.isRead ?? n.read),
    silent: Boolean(n.silent),
    customerId: n.customerId,
    errorType: n.errorType,
    metadata: n.metadata,
    data: parsedData,
    severity: n.severity,
    source: "system" as const,
  };
};

const formatNotificationTime = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "الآن";
  if (diffMins === 1) return "منذ دقيقة";
  if (diffMins === 2) return "منذ دقيقتين";
  if (diffMins >= 3 && diffMins <= 10) return `منذ ${diffMins} دقائق`;
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours === 1) return "منذ ساعة";
  if (diffHours === 2) return "منذ ساعتين";
  if (diffHours >= 3 && diffHours <= 10) return `منذ ${diffHours} ساعات`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) {
    return `أمس ${date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDays === 2) return "منذ يومين";
  if (diffDays >= 3 && diffDays <= 10) return `منذ ${diffDays} أيام`;

  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
  });
};

const resolveTargetUrl = (notification: NotificationItem): string | null => {
  const data = (notification.data || notification.metadata || {}) as Record<string, any>;
  if (typeof data.url === "string" && data.url.trim().length > 0) {
    return data.url.trim();
  }
  if (data.orderId) {
    return `/orders?orderId=${encodeURIComponent(String(data.orderId))}`;
  }
  if (data.conversationId) {
    return `/whatsapp-inbox?conversationId=${encodeURIComponent(String(data.conversationId))}`;
  }
  if (data.taskId) {
    return `/tasks/${encodeURIComponent(String(data.taskId))}`;
  }
  if (data.customerId) {
    return `/customers/${encodeURIComponent(String(data.customerId))}`;
  }
  return null;
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchNotifications = useCallback(
    async (showLoadingSpinner = true) => {
      if (!user || !isAuthenticated) {
        setLoading(false);
        return;
      }

      if (showLoadingSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await apiClient.get("/v1/notifications/recent", {
          params: { limit: 50 },
        });

        if (response.data?.success || response.status === 200) {
          const rawItems = response.data?.notifications || [];
          const normalized = rawItems.map(normalizeNotification);
          setNotifications(normalized);
        }
      } catch (error) {
        console.error("❌ [NotificationsPage] Error fetching notifications:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, isAuthenticated],
  );

  useEffect(() => {
    fetchNotifications(true);

    const handleRealtimeUpdate = () => {
      fetchNotifications(false);
    };

    socketService.on("new_notification", handleRealtimeUpdate);
    socketService.on("order:created", handleRealtimeUpdate);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socketService.off("new_notification", handleRealtimeUpdate);
      socketService.off("order:created", handleRealtimeUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post("/notifications/mark-all-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("تعذر تحديد الإشعارات كمقروءة");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("تم حذف الإشعار");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("تعذر حذف الإشعار");
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    const targetUrl = resolveTargetUrl(notification);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (!targetUrl) return;

    if (/^https?:\/\//i.test(targetUrl)) {
      try {
        const parsed = new URL(targetUrl);
        if (parsed.origin === window.location.origin) {
          navigate(parsed.pathname + parsed.search + parsed.hash);
          return;
        }
      } catch {
        // Ignored
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(targetUrl);
  };

  const getIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("order")) {
      return <ShoppingBagIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (normalized.includes("error")) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
    if (normalized.includes("warning")) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
    }
    if (normalized.includes("success")) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (normalized.includes("test")) {
      return <BellSolidIcon className="h-5 w-5 text-blue-500" />;
    }
    return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
  };

  const getTypeBadge = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("stoppage") || normalized.includes("order_sync")) {
      return {
        label: "توقف أوردرات",
        className: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700 font-bold",
      };
    }
    if (normalized.includes("ad_campaign") || normalized.includes("ads_stopped")) {
      return {
        label: "توقف إعلانات",
        className: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700 font-bold",
      };
    }
    if (normalized.includes("automation")) {
      return {
        label: "أتمتة",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
      };
    }
    if (normalized.includes("incident") || normalized.includes("disconnect")) {
      return {
        label: "عطل سيستم",
        className: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/70 dark:text-red-200 dark:border-red-700 font-bold",
      };
    }
    if (normalized.includes("order")) {
      return {
        label: "طلب",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }
    if (normalized.includes("error")) {
      return {
        label: "خطأ",
        className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
      };
    }
    if (normalized.includes("warning")) {
      return {
        label: "تحذير",
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      };
    }
    if (normalized.includes("success")) {
      return {
        label: "نجاح",
        className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
      };
    }
    if (normalized.includes("test")) {
      return {
        label: "تجريبي",
        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      };
    }
    if (normalized.includes("attendance")) {
      return {
        label: "حضور",
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      };
    }
    return {
      label: "معلومات",
      className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    };
  };

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((item) => {
        const matchesRead =
          filter === "all" ||
          (filter === "read" && item.isRead) ||
          (filter === "unread" && !item.isRead);

        const normalizedType = item.type.toLowerCase();
        let matchesType = true;
        if (typeFilter === "incidents") {
          matchesType =
            normalizedType.includes("incident") ||
            normalizedType.includes("stoppage") ||
            normalizedType.includes("stale") ||
            normalizedType.includes("disconnect") ||
            normalizedType.includes("automation");
        } else if (typeFilter === "order") {
          matchesType = normalizedType.includes("order") && !normalizedType.includes("stoppage");
        } else if (typeFilter === "warning") {
          matchesType = normalizedType.includes("warning");
        } else if (typeFilter === "error") {
          matchesType = normalizedType.includes("error");
        } else if (typeFilter === "success") {
          matchesType = normalizedType.includes("success");
        } else if (typeFilter === "info") {
          matchesType =
            normalizedType.includes("info") ||
            (!normalizedType.includes("order") &&
              !normalizedType.includes("error") &&
              !normalizedType.includes("warning") &&
              !normalizedType.includes("success") &&
              !normalizedType.includes("incident") &&
              !normalizedType.includes("stoppage"));
        }

        return matchesRead && matchesType;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notifications, filter, typeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-600 border-t-transparent mb-4"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل الإشعارات...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-20 sm:pb-8">
      {/* Consolidated Clean Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-3 sm:p-4 shadow-sm space-y-2.5">
        {/* Row 1: Title & Actions (Never truncated) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
              الإشعارات
            </h1>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                {unreadCount} غير مقروء
              </span>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({notifications.length})
              </span>
            )}
          </div>

          {/* Actions: Mark all read + Refresh + Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs touch-manipulation"
                title="تحديد الكل كمقروء"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">قراءة الكل</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchNotifications(false)}
              disabled={refreshing}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition border border-gray-200 dark:border-gray-700 touch-manipulation disabled:opacity-50"
              title="تحديث القائمة"
              aria-label="تحديث"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <Link
              to="/notification-settings"
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition border border-gray-200 dark:border-gray-700 touch-manipulation no-underline"
              title="إعدادات الإشعارات"
              aria-label="الإعدادات"
            >
              <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Row 2: Status Tabs (3 Equal Columns - Zero Collision) */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900/80 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation text-center ${
              filter === "all"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            الكل ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation text-center ${
              filter === "unread"
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            غير مقروءة ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("read")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all touch-manipulation text-center ${
              filter === "read"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            مقروءة ({notifications.length - unreadCount})
          </button>
        </div>

        {/* Row 3: Category Filter Chips (Consistent text-xs, no browser select quirks) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar text-xs">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0 ml-1">
            التصنيف:
          </span>
          {[
            { key: "all", label: "الجميع" },
            { key: "incidents", label: "🚨 أعطال السيستم" },
            { key: "order", label: "طلبات البيع" },
            { key: "info", label: "معلومات" },
            { key: "warning", label: "تنبيهات" },
            { key: "error", label: "أخطاء" },
            { key: "success", label: "نجاح" },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setTypeFilter(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors touch-manipulation ${
                typeFilter === cat.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-900/70 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-8 sm:p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 mx-auto mb-3 flex items-center justify-center">
              <BellIcon className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
              لا توجد إشعارات حالياً
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
              {filter === "unread"
                ? "رائع! لقد قرأت جميع الإشعارات المتاحة."
                : "ستظهر هنا أي تنبيهات أو طلبات جديدة فور وصولها."}
            </p>
            <button
              type="button"
              onClick={() => fetchNotifications(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition touch-manipulation"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>إعادة التحقق</span>
            </button>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const targetUrl = resolveTargetUrl(notification);
            const badge = getTypeBadge(notification.type);
            const isClickable = Boolean(targetUrl);

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isClickable ? "cursor-pointer" : ""
                } ${
                  !notification.isRead
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs"
                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-xs"
                }`}
              >
                {/* Visual Unread Accent Indicator */}
                {!notification.isRead && (
                  <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-blue-600 dark:bg-blue-500" />
                )}

                <div className="p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4">
                  {/* Notification Icon Bubble */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h2
                          className={`text-sm sm:text-base font-semibold leading-snug truncate ${
                            !notification.isRead
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {notification.title}
                        </h2>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Card Action Buttons (Eye & Trash) - Touch Friendly */}
                      <div className="flex items-center gap-1 shrink-0 -mt-1 -ml-1">
                        {!notification.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors touch-manipulation"
                            title="تحديد كمقروء"
                            aria-label="تحديد كمقروء"
                          >
                            <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors touch-manipulation"
                          title="حذف الإشعار"
                          aria-label="حذف الإشعار"
                        >
                          <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-2.5">
                      {notification.message}
                    </p>

                    {/* Footer Details: Relative Time + Target Link */}
                    <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100/80 dark:border-gray-700/40">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400/80 shrink-0" />
                        <span className="leading-none" title={notification.timestamp.toLocaleString("ar-EG")}>
                          {formatNotificationTime(notification.timestamp)}
                        </span>
                        {notification.isRead && (
                          <span className="inline-flex items-center gap-0.5 text-gray-400 mr-1.5 text-[10px] sm:text-[11px]">
                            <CheckIcon className="h-3 w-3 text-green-500 shrink-0" />
                            <span>مقروء</span>
                          </span>
                        )}
                      </div>

                      {targetUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                          <span>عرض التفاصيل</span>
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
