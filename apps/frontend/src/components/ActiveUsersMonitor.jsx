import React, { useState, useEffect } from "react";
import {
  Clock,
  User,
  Briefcase,
  X,
  RotateCw,
  ExternalLink,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";

const ActiveUsersMonitor = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stoppingTimer, setStoppingTimer] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    fetchActiveUsers();

    const handleVisibilityChange = () => {
      if (!document.hidden && isOpen) {
        fetchActiveUsers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const timerInterval = setInterval(() => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    }, 1000);

    const refreshInterval = setInterval(() => {
      if (!document.hidden && isOpen) {
        fetchActiveUsers();
      }
    }, 30000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen]);

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("admin/active-users", {
        _skipErrorToast: true,
        _skipTransientRetry: true,
      });

      if (response.status === 200) {
        setActiveUsers(response.data?.data?.activeUsers || []);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setActiveUsers([]);
      } else {
        setError(err?.message || "حدث خطأ أثناء تحميل المستخدمين");
      }
      setActiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateLiveDuration = (startTime) => {
    const start = new Date(startTime);
    const duration = Math.floor((currentTime - start) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      URGENT: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      HIGH: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      MEDIUM: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      LOW: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
    return configs[priority] || "text-muted-foreground bg-muted border-border/60";
  };

  const getStatusBadge = (status) => {
    const configs = {
      TODO: "text-muted-foreground bg-muted border-border/60",
      IN_PROGRESS: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      IN_REVIEW: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      DONE: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      BLOCKED: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    };
    return configs[status] || "text-muted-foreground bg-muted border-border/60";
  };

  const handleStopTimerOnly = async (taskId, entryId) => {
    try {
      setStoppingTimer(entryId);

      const response = await apiClient.post(
        `super-admin/dev/tasks/${taskId}/timer/stop`,
        { timerId: entryId, description: "" }
      );

      if (response.status === 200) {
        fetchActiveUsers();
      }
    } catch (err) {
      console.error("Error stopping timer:", err);
    } finally {
      setStoppingTimer(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-16 sm:pt-20 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-users-title"
      dir="rtl"
    >
      <div
        className="bg-card rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[82vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 shrink-0 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="active-users-title"
                className="text-base sm:text-lg font-bold text-foreground"
              >
                المستخدمون النشطون حالياً
              </h2>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {activeUsers.length} مستخدم يعمل الآن على المهام
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchActiveUsers}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-2xs"
              title="تحديث القائمة"
              aria-label="تحديث"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-2xs"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 flex-1 space-y-4">
          {loading && activeUsers.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 gap-3">
              <RotateCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-mono">جاري فحص الجلسات النشطة...</span>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-center">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
            </div>
          ) : activeUsers.length === 0 ? (
            <div className="bg-muted/30 border border-border/60 rounded-2xl p-12 text-center space-y-2">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm font-semibold text-foreground">
                لا يوجد مستخدمون نشطون في الوقت الحالي
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                سيظهر هنا أعضاء الفريق عند تشغيل عداد الوقت (Timer) على أي مهمة عمل.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeUsers.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-card rounded-xl p-4 border border-border/70 shadow-2xs hover:border-border transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {entry.user?.avatar ? (
                          <img
                            src={entry.user.avatar}
                            alt={entry.user.name}
                            className="h-10 w-10 rounded-full object-cover border border-border/80"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-foreground truncate">
                          {entry.user?.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {entry.user?.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {entry.user?.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timer Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between self-stretch sm:self-auto gap-1">
                      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-base font-mono font-bold tabular-nums">
                          {calculateLiveDuration(entry.startTime)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                        بدأ{" "}
                        {new Date(entry.startTime).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Task Info */}
                  <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {entry.task?.title}
                      </p>
                      {entry.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {entry.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          entry.task?.priority
                        )}`}
                      >
                        {entry.task?.priority}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadge(
                          entry.task?.status
                        )}`}
                      >
                        {entry.task?.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopTimerOnly(entry.task.id, entry.id);
                      }}
                      disabled={stoppingTimer === entry.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-95 transition-all shadow-2xs"
                    >
                      {stoppingTimer === entry.id ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الإيقاف...</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3" />
                          <span>إيقاف العداد</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/super-admin/dev-tasks/${entry.task.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>فتح المهمة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersMonitor;
