import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import {
  NotificationItem,
  NotificationReadFilter,
  normalizeNotification,
  resolveTargetUrl,
} from "./types";

export const useNotificationsController = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationReadFilter>("all");
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
    [user?.id, user?.companyId, isAuthenticated],
  );

  useEffect(() => {
    fetchNotifications(true);

    const handleRealtimeUpdate = () => {
      fetchNotifications(false);
    };

    socketService.on("new_notification", handleRealtimeUpdate);
    socketService.on("notification:new", handleRealtimeUpdate);
    socketService.on("order:status_alert", handleRealtimeUpdate);
    socketService.on("order:created", handleRealtimeUpdate);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socketService.off("new_notification", handleRealtimeUpdate);
      socketService.off("notification:new", handleRealtimeUpdate);
      socketService.off("order:status_alert", handleRealtimeUpdate);
      socketService.off("order:created", handleRealtimeUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post("/notifications/mark-all-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("تعذر تحديد الإشعارات كمقروءة");
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("تم حذف الإشعار");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("تعذر حذف الإشعار");
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
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
    },
    [markAsRead, navigate],
  );

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

  const incidentsCount = useMemo(
    () =>
      notifications.filter((n) => {
        const t = n.type.toLowerCase();
        return t.includes("incident") || t.includes("stoppage") || t.includes("error");
      }).length,
    [notifications],
  );

  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notifications.filter((n) => n.timestamp >= today).length;
  }, [notifications]);

  return {
    notifications,
    filteredNotifications,
    loading,
    refreshing,
    filter,
    setFilter,
    typeFilter,
    setTypeFilter,
    unreadCount,
    incidentsCount,
    todayCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
  };
};

export type NotificationsController = ReturnType<typeof useNotificationsController>;
