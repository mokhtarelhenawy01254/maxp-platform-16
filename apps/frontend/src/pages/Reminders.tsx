import React, { useState, useEffect } from "react";
import { useDateFormat } from "../hooks/useDateFormat";
import api from "../services/api";
import {
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "triggered" | "completed" | "dismissed";
  companyId: string;
  userId: string;
  customerId?: string;
  scheduledTime: string;
  createdAt: string;
  snoozeCount: number;
  maxSnooze: number;
  canSnooze: boolean;
  metadata: any;
}

const Reminders: React.FC = () => {
  const { formatDate } = useDateFormat();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "stats">(
    "active",
  );

  // Create reminder form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    type: "FOLLOW_UP",
    priority: "medium",
    customerId: "",
    scheduledTime: "",
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load reminders
      const remindersResponse = await api.get("/reminders?companyId=1");
      if (remindersResponse.data.success) {
        setReminders(remindersResponse.data.data.reminders);
      }

      // Load stats
      const statsResponse = await api.get("/reminders/stats?companyId=1");
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!createForm.title.trim() || !createForm.scheduledTime) return;

    try {
      const response = await api.post("/reminders", {
        ...createForm,
        companyId: "1",
        userId: "1",
        relatedEntity: createForm.customerId
          ? {
              type: "customer",
              id: createForm.customerId,
            }
          : null,
      });

      if (response.data.success) {
        await loadData();
        setShowCreateForm(false);
        setCreateForm({
          title: "",
          description: "",
          type: "FOLLOW_UP",
          priority: "medium",
          customerId: "",
          scheduledTime: "",
        });
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
    }
  };

  const handleUpdateStatus = async (
    reminderId: string,
    status: string,
    notes = "",
  ) => {
    try {
      await api.put(`/reminders/${reminderId}/status`, { status, notes });
      await loadData();
    } catch (error) {
      console.error("Error updating reminder status:", error);
    }
  };

  const handleSnoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      await api.post(`/reminders/${reminderId}/snooze`, {
        snoozeMinutes: minutes,
      });
      await loadData();
    } catch (error) {
      console.error("Error snoozing reminder:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
      case "triggered":
        return <BellIcon className="h-4 w-4 text-primary" />;
      case "dismissed":
        return <XMarkIcon className="h-4 w-4 text-muted-foreground" />;
      default:
        return <ClockIcon className="h-4 w-4 text-amber-500" />;
    }
  };

  const isOverdue = (scheduledTime: string) => {
    return new Date(scheduledTime) < new Date();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      if (overdueMins < 60) return `متأخر ${overdueMins} دقيقة`;
      if (overdueMins < 1440)
        return `متأخر ${Math.floor(overdueMins / 60)} ساعة`;
      return `متأخر ${Math.floor(overdueMins / 1440)} يوم`;
    }

    if (diffMins < 60) return `خلال ${diffMins} دقيقة`;
    if (diffHours < 24) return `خلال ${diffHours} ساعة`;
    return `خلال ${diffDays} يوم`;
  };

  const activeReminders = reminders.filter(
    (r) => r.status === "pending" || r.status === "triggered",
  );
  const completedReminders = reminders.filter(
    (r) => r.status === "completed" || r.status === "dismissed",
  );

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <BellIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                التذكيرات والمتابعة
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                تنبيهات نشطة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة تنبيهات المهام والمتابعات اليومية مع العملاء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="h-8 px-3 rounded-lg text-xs font-mono font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            تذكير جديد
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="h-8 px-3 rounded-lg text-xs font-mono font-medium border border-border/80 bg-card hover:bg-muted/50 text-foreground transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
          >
            <ArrowPathIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">التذكيرات النشطة</span>
            <span className="size-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {stats?.active?.total ?? activeReminders.length}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">متأخرة عن الموعد</span>
            <span className="size-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {stats?.active?.overdue ?? 0}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">مكتملة هذا الأسبوع</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats?.completed?.thisWeek ?? completedReminders.length}
          </div>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">معدل الإنجاز</span>
            <span className="size-1.5 rounded-full bg-violet-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {stats?.performance?.completionRate ? `${Math.round(stats.performance.completionRate * 100)}%` : "0%"}
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-all active:scale-[0.98] ${
            activeTab === "active"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClockIcon className="size-3.5 inline ml-1.5" />
          النشطة ({activeReminders.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-all active:scale-[0.98] ${
            activeTab === "completed"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircleIcon className="size-3.5 inline ml-1.5" />
          المكتملة ({completedReminders.length})
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-all active:scale-[0.98] ${
            activeTab === "stats"
              ? "bg-background text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarIcon className="size-3.5 inline ml-1.5" />
          الإحصائيات
        </button>
      </div>

      {/* Create Reminder Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xl max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              إنشاء تذكير جديد
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  العنوان
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="عنوان التذكير"
                />
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">
                  الوصف
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="وصف التذكير"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">
                    النوع
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, type: e.target.value })
                    }
                    className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="FOLLOW_UP">متابعة عميل</option>
                    <option value="QUOTE_FOLLOW_UP">متابعة عرض سعر</option>
                    <option value="PAYMENT_REMINDER">تذكير دفع</option>
                    <option value="TASK_REMINDER">تذكير مهمة</option>
                    <option value="APPOINTMENT_REMINDER">تذكير موعد</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">
                    الأولوية
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value,
                      })
                    }
                    className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-foreground mb-1">
                  وقت التذكير
                </label>
                <input
                  type="datetime-local"
                  value={createForm.scheduledTime}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      scheduledTime: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-muted-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateReminder}
                disabled={
                  !createForm.title.trim() || !createForm.scheduledTime
                }
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-mono font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {activeReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-12 text-center bg-card/20">
              <BellIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                لا توجد تذكيرات نشطة
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                جميع التذكيرات مكتملة أو لم يتم جدولة تذكيرات بعد
              </p>
            </div>
          ) : (
            activeReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`rounded-xl border transition-all ${
                  isOverdue(reminder.scheduledTime)
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/80 bg-card hover:border-border"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {getStatusIcon(reminder.status)}
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          {reminder.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${getPriorityColor(reminder.priority)}`}
                        >
                          {reminder.priority === "high"
                            ? "عالية"
                            : reminder.priority === "medium"
                              ? "متوسطة"
                              : "منخفضة"}
                        </span>
                        {isOverdue(reminder.scheduledTime) && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-destructive/15 text-destructive border border-destructive/25">
                            متأخر
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        {reminder.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {formatTime(reminder.scheduledTime)}
                        </span>
                        {reminder.customerId && (
                          <span className="flex items-center gap-1 font-mono">
                            <UserIcon className="h-3.5 w-3.5" />
                            عميل #{reminder.customerId}
                          </span>
                        )}
                        {reminder.snoozeCount > 0 && (
                          <span className="text-amber-500 font-mono text-[11px]">
                            تم التأجيل {reminder.snoozeCount} مرة
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          handleUpdateStatus(reminder.id, "completed")
                        }
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        title="تم الإنجاز"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>

                      {reminder.canSnooze &&
                        reminder.snoozeCount < reminder.maxSnooze && (
                          <div className="relative group">
                            <button className="h-8 w-8 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-colors">
                              <ClockIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-0 mt-1 w-32 bg-popover text-popover-foreground border border-border rounded-lg shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 p-1">
                              <button
                                onClick={() =>
                                  handleSnoozeReminder(reminder.id, 15)
                                }
                                className="w-full text-right px-2.5 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                              >
                                15 دقيقة
                              </button>
                              <button
                                onClick={() =>
                                  handleSnoozeReminder(reminder.id, 60)
                                }
                                className="w-full text-right px-2.5 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                              >
                                ساعة واحدة
                              </button>
                              <button
                                onClick={() =>
                                  handleSnoozeReminder(reminder.id, 240)
                                }
                                className="w-full text-right px-2.5 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                              >
                                4 ساعات
                              </button>
                            </div>
                          </div>
                        )}

                      <button
                        onClick={() =>
                          handleUpdateStatus(reminder.id, "dismissed")
                        }
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="تجاهل"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "completed" && (
        <div className="space-y-3">
          {completedReminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-12 text-center bg-card/20">
              <CheckCircleIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                لا توجد تذكيرات مكتملة
              </h3>
            </div>
          ) : (
            completedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="rounded-xl border border-border/80 bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {getStatusIcon(reminder.status)}
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {reminder.title}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          reminder.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {reminder.status === "completed"
                          ? "مكتمل"
                          : "تم التجاهل"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {reminder.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span>
                        تم الإنشاء: {formatDate(reminder.createdAt)}
                      </span>
                      <span>
                        كان مجدولاً: {formatDate(reminder.scheduledTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "stats" && stats && (
        <div className="space-y-4">
          {/* Performance Metrics */}
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
              مقاييس الأداء
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {Math.round(stats.performance.completionRate * 100)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">معدل الإنجاز</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {stats.performance.averageSnoozeCount.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">متوسط التأجيل</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {Math.round(stats.performance.onTimeCompletion * 100)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">الإنجاز في الوقت</div>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
              الاتجاهات الزمنية
            </h3>
            <div className="space-y-2">
              {stats.trends.map((trend: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <span className="text-xs font-medium text-foreground">
                    {trend.period}
                  </span>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <span>تم الإنشاء: <strong className="text-foreground">{trend.created}</strong></span>
                    <span>مكتمل: <strong className="text-emerald-500">{trend.completed}</strong></span>
                    <span>متأخر: <strong className="text-destructive">{trend.overdue}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
