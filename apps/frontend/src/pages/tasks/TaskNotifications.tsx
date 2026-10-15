import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  Layers,
  ArrowRight
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId: string | null;
  projectId: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  whatsappStatus?: "sent" | "failed" | "pending" | null;
  whatsappLogId?: string | null;
}

const TaskNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const getAccessToken = (): string | null => tokenManager.getAccessToken();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const filterParam = filter === "unread" ? "&unreadOnly=true" : "";
      const url = `tasks/notifications?includeWhatsapp=true${filterParam}`;

      const response = await fetch(buildApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const resendWhatsApp = async (notificationId: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/notifications/${notificationId}/resend-whatsapp`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error resending notification:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = getAccessToken();
      await fetch(buildApiUrl(`tasks/notifications/${notificationId}/read`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = getAccessToken();
      await fetch(buildApiUrl("tasks/notifications/read-all"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "due_soon":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case "comment":
      case "mention":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "status_changed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString("ar-EG");
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل الإشعارات...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">
                  مركز إشعارات المهام
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-destructive/10 text-destructive border border-destructive/20">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة تحديثات المهام المسندة والمواعيد النهائية وإشعارات تطبيق واتساب
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors shadow-sm"
          >
            <CheckCheck className="w-3.5 h-3.5 text-primary" />
            <span>تحديد الكل كمقروء</span>
          </button>
        )}
      </div>

      {/* Filter Switcher */}
      <div className="bg-card border border-border/70 rounded-xl p-1 shadow-sm inline-flex gap-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة الإشعارات
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "unread"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>غير المقروء فقط</span>
          {unreadCount > 0 && (
            <span className="font-mono tabular-nums text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List Surface */}
      <div className="bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden divide-y divide-border/40">
        {notifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Bell className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <p className="text-xs text-muted-foreground">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition-colors hover:bg-muted/20 ${
                !notification.isRead ? "bg-primary/[0.03]" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTime(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                          title="تحديد كمقروء"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {notification.link && (
                      <Link
                        to={notification.link}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span>عرض تفاصيل المهمة</span>
                        <ArrowRight className="w-3 h-3 rotate-180" />
                      </Link>
                    )}

                    {notification.whatsappStatus && (
                      <div className="flex items-center gap-1 text-[11px] font-medium">
                        {notification.whatsappStatus === "sent" && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>أُرسلت بنجاح عبر واتساب</span>
                          </span>
                        )}
                        {notification.whatsappStatus === "failed" && (
                          <button
                            type="button"
                            onClick={() => resendWhatsApp(notification.id)}
                            className="inline-flex items-center gap-1 text-destructive hover:underline"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>تعذر الإرسال — إعادة المحاولة الآن</span>
                          </button>
                        )}
                        {notification.whatsappStatus === "pending" && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>بانتظار الإرسال المجدول</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskNotifications;
