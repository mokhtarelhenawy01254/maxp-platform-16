import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { useAuth } from "../hooks/useAuthSimple";
import { socketService } from "../services/socketService";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Eye,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Settings,
  RefreshCw,
  ShoppingBag,
  Clock,
  ExternalLink,
  Zap,
  ShieldAlert,
  Calendar,
  CheckCheck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

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
      return <ShoppingBag className="size-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (normalized.includes("error")) {
      return <AlertCircle className="size-4 text-rose-500" />;
    }
    if (normalized.includes("warning")) {
      return <AlertTriangle className="size-4 text-amber-500" />;
    }
    if (normalized.includes("success")) {
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    }
    if (normalized.includes("incident") || normalized.includes("stoppage")) {
      return <ShieldAlert className="size-4 text-rose-500" />;
    }
    return <Info className="size-4 text-sky-500" />;
  };

  const getTypeBadge = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("stoppage") || normalized.includes("order_sync")) {
      return {
        label: "توقف أوردرات",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium",
      };
    }
    if (normalized.includes("ad_campaign") || normalized.includes("ads_stopped")) {
      return {
        label: "توقف إعلانات",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-medium",
      };
    }
    if (normalized.includes("automation")) {
      return {
        label: "أتمتة",
        className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 font-medium",
      };
    }
    if (normalized.includes("incident") || normalized.includes("disconnect")) {
      return {
        label: "عطل سيستم",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-medium",
      };
    }
    if (normalized.includes("order")) {
      return {
        label: "طلب بيع",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium",
      };
    }
    if (normalized.includes("error")) {
      return {
        label: "خطأ",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-medium",
      };
    }
    if (normalized.includes("warning")) {
      return {
        label: "تحذير",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium",
      };
    }
    if (normalized.includes("success")) {
      return {
        label: "نجاح",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium",
      };
    }
    return {
      label: "معلومات",
      className: "bg-muted text-muted-foreground border-border/60 font-medium",
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-xs font-mono text-muted-foreground">جاري استدعاء مركز الإشعارات...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Bell className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">مركز التنبيهات</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">متابعة فورية للأحداث التشغيلية، ومبيعات المتاجر، والتنبيهات النظامية</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <CheckCheck className="size-3.5 text-primary" />
              <span>قراءة الكل</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchNotifications(false)}
            disabled={refreshing}
            className="size-8 rounded-lg shadow-2xs active:scale-[0.98] transition-transform"
            title="تحديث القائمة"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Link
            to="/notification-settings"
            className="inline-flex items-center justify-center size-8 rounded-lg border border-border/80 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground shadow-2xs active:scale-[0.98] transition-transform"
            title="إعدادات الإشعارات"
          >
            <Settings className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الإشعارات</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {notifications.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">غير مقروءة</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {unreadCount}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أعطال وتنبيهات حرجة</span>
              <span className="size-1.5 rounded-full bg-rose-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {incidentsCount}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">وارد اليوم</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {todayCount}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        {/* Chassis Control Bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Read Status Filter */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs shrink-0 self-start">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === "unread"
                  ? "bg-card text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              غير مقروءة ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("read")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === "read"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مقروءة ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 no-scrollbar text-xs">
            {[
              { key: "all", label: "الجميع" },
              { key: "incidents", label: "أعطال النظام" },
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
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  typeFilter === cat.key
                    ? "bg-foreground text-background font-semibold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List Container */}
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="size-12 rounded-xl bg-muted/50 text-muted-foreground mx-auto mb-3 flex items-center justify-center">
              <Bell className="size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              لا توجد إشعارات تطابق التصفية
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              {filter === "unread"
                ? "رائع! لقد قرأت جميع الإشعارات المتاحة."
                : "ستظهر هنا أي تنبيهات أو طلبات جديدة فور وصولها."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNotifications(false)}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <RefreshCw className="size-3" />
              <span>إعادة التحقق</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredNotifications.map((notification) => {
              const targetUrl = resolveTargetUrl(notification);
              const badge = getTypeBadge(notification.type);
              const isClickable = Boolean(targetUrl);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group relative p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                    isClickable ? "cursor-pointer" : ""
                  } ${
                    !notification.isRead
                      ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Visual Unread Accent Indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-0 bottom-0 right-0 w-1 bg-primary" />
                  )}

                  {/* Icon Bubble */}
                  <div className="size-8.5 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h2
                          className={`text-xs sm:text-sm font-semibold leading-snug truncate ${
                            !notification.isRead
                              ? "text-foreground font-bold"
                              : "text-foreground/80"
                          }`}
                        >
                          {notification.title}
                        </h2>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Micro Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="size-7 text-muted-foreground hover:text-primary rounded-md"
                            title="تحديد كمقروء"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="size-7 text-muted-foreground hover:text-rose-600 rounded-md"
                          title="حذف الإشعار"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mb-2">
                      {notification.message}
                    </p>

                    {/* Footer Details: Time + Target Link */}
                    <div className="flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                        <span title={notification.timestamp.toLocaleString("ar-EG")}>
                          {formatNotificationTime(notification.timestamp)}
                        </span>
                        {notification.isRead && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground/70 mr-1.5">
                            <Check className="size-2.5 text-emerald-500" />
                            <span>مقروء</span>
                          </span>
                        )}
                      </div>

                      {targetUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary group-hover:underline">
                          <span>عرض التفاصيل</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
