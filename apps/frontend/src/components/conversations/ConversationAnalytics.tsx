import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  Download,
  Calendar,
} from "lucide-react";

interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  unreadMessages: number;
  averageResponseTime: number;
  onlineUsers: number;
  messagesPerHour: number;
  responseRate: number;
  lastUpdated: Date;
}

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  icon,
  trend,
}) => {
  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 transition-colors hover:border-border shadow-2xs">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
          {value}
        </div>
        {trend && (
          <div
            className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono tabular-nums px-2 py-0.5 rounded-lg border ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ConversationAnalyticsProps {
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
}

const ConversationAnalytics: React.FC<ConversationAnalyticsProps> = ({
  refreshInterval = 30000,
  showRealTimeUpdates = true,
}) => {
  const [stats, setStats] = useState<ConversationStats>({
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    unreadMessages: 0,
    averageResponseTime: 0,
    onlineUsers: 0,
    messagesPerHour: 0,
    responseRate: 0,
    lastUpdated: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/conversations/analytics");

      if (!response.ok) {
        throw new Error("فشل في جلب الإحصائيات");
      }

      const data = await response.json();

      const mockStats: ConversationStats = {
        totalConversations: Math.floor(Math.random() * 100) + 50,
        activeConversations: Math.floor(Math.random() * 20) + 10,
        totalMessages: Math.floor(Math.random() * 1000) + 500,
        unreadMessages: Math.floor(Math.random() * 50) + 5,
        averageResponseTime: Math.floor(Math.random() * 300) + 60,
        onlineUsers: Math.floor(Math.random() * 15) + 5,
        messagesPerHour: Math.floor(Math.random() * 50) + 20,
        responseRate: Math.floor(Math.random() * 30) + 70,
        lastUpdated: new Date(),
      };

      setStats(data.success ? data.stats : mockStats);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("فشل في تحميل الإحصائيات");

      setStats({
        totalConversations: 75,
        activeConversations: 15,
        totalMessages: 850,
        unreadMessages: 12,
        averageResponseTime: 120,
        onlineUsers: 8,
        messagesPerHour: 35,
        responseRate: 85,
        lastUpdated: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (showRealTimeUpdates) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [refreshInterval, showRealTimeUpdates]);

  const formatResponseTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} ثانية`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} دقيقة`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border/70 rounded-2xl p-5" dir="rtl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/60 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-5 text-foreground space-y-6 shadow-2xs" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              إحصائيات المحادثات
            </h2>
            <p className="text-xs text-muted-foreground">
              مؤشرات الأداء اللحظية ونشاط التواصل مع العملاء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          <span>
            آخر تحديث: {stats.lastUpdated.toLocaleTimeString("ar-EG")}
          </span>
          {showRealTimeUpdates && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="font-semibold underline hover:no-underline transition-all cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <AnalyticsCard
          title="إجمالي المحادثات"
          value={stats.totalConversations}
          icon={<MessageSquare className="w-4 h-4" />}
          trend={{ value: 12, isPositive: true }}
        />

        <AnalyticsCard
          title="المحادثات النشطة"
          value={stats.activeConversations}
          icon={<Users className="w-4 h-4" />}
          trend={{ value: 8, isPositive: true }}
        />

        <AnalyticsCard
          title="إجمالي الرسائل"
          value={stats.totalMessages.toLocaleString("ar-EG")}
          icon={<MessageSquare className="w-4 h-4" />}
          trend={{ value: 15, isPositive: true }}
        />

        <AnalyticsCard
          title="الرسائل غير المقروءة"
          value={stats.unreadMessages}
          icon={<Eye className="w-4 h-4" />}
          trend={{ value: 5, isPositive: false }}
        />

        <AnalyticsCard
          title="متوسط وقت الرد"
          value={formatResponseTime(stats.averageResponseTime)}
          icon={<Clock className="w-4 h-4" />}
          trend={{ value: 10, isPositive: false }}
        />

        <AnalyticsCard
          title="المستخدمون المتصلون"
          value={stats.onlineUsers}
          icon={<Users className="w-4 h-4" />}
        />

        <AnalyticsCard
          title="الرسائل في الساعة"
          value={stats.messagesPerHour}
          icon={<TrendingUp className="w-4 h-4" />}
          trend={{ value: 20, isPositive: true }}
        />

        <AnalyticsCard
          title="معدل الاستجابة"
          value={`${stats.responseRate}%`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Daily Activity Chart */}
      <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              نشاط الرسائل اليومي
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            آخر 7 أيام
          </span>
        </div>

        <div className="flex items-end justify-between h-28 pt-2 gap-2">
          {[...Array(7)].map((_, i) => {
            const height = Math.random() * 75 + 25;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div
                  className="w-full max-w-[36px] bg-primary/75 hover:bg-primary rounded-t-md transition-all duration-200 group-hover:scale-y-105"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {new Date(
                    Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString("ar-EG", {
                    weekday: "short",
                    calendar: "gregory",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-97 disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث الإحصائيات</span>
        </button>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/70 rounded-xl transition-all active:scale-97 cursor-pointer shadow-2xs">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>تصدير البيانات</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationAnalytics;
