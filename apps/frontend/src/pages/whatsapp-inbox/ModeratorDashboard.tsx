import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { translateInboxApiError } from './errorTranslation';
import { formatQueueLabel } from './queuePresentation';

type DashboardResponse = {
  success?: boolean;
  stats: {
    newChats: number;
    closedChats: number;
    totalActive: number;
    pendingChats: number;
    todayConversations: number;
    unreadCount: number;
    avgResponseTime: number;
    queueSize: number;
    onlineModerators: number;
    slaBreached: number;
    missedChats: number;
  };
  queueCounters: {
    total: number;
    waiting: number;
    assigned: number;
    pending: number;
    closed: number;
    escalated: number;
    slaAtRisk: number;
    slaBreached: number;
    missedChats: number;
  };
  sessionStatuses: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    isOnline: boolean;
    lastConnectedAt: string | null;
  }>;
  moderatorWorkloads: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      role: string;
      department: string | null;
    };
    online: boolean;
    assigned: number;
    pending: number;
    unread: number;
    closedToday: number;
    avgResponseTime: number;
    workload: number;
  }>;
  latestConversations: Array<{
    id: string;
    status: string;
    lastMessagePreview: string | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      avatar: string | null;
    };
    queueKey?: string | null;
  }>;
  slaSummary: {
    atRisk: number;
    breached: number;
  };
  cachedAt: string;
};

type DashboardApiResponse = DashboardResponse & {
  success: boolean;
};

const defaultDashboard: DashboardResponse = {
  stats: {
    newChats: 0,
    closedChats: 0,
    totalActive: 0,
    pendingChats: 0,
    todayConversations: 0,
    unreadCount: 0,
    avgResponseTime: 0,
    queueSize: 0,
    onlineModerators: 0,
    slaBreached: 0,
    missedChats: 0,
  },
  queueCounters: {
    total: 0,
    waiting: 0,
    assigned: 0,
    pending: 0,
    closed: 0,
    escalated: 0,
    slaAtRisk: 0,
    slaBreached: 0,
    missedChats: 0,
  },
  sessionStatuses: [],
  moderatorWorkloads: [],
  latestConversations: [],
  slaSummary: {
    atRisk: 0,
    breached: 0,
  },
  cachedAt: new Date().toISOString(),
};

const normalizeDashboardResponse = (payload: Partial<DashboardResponse> | undefined): DashboardResponse => {
  const safePayload = payload || {};

  return {
  ...defaultDashboard,
  ...safePayload,
  stats: {
    ...defaultDashboard.stats,
    ...(safePayload.stats || {}),
  },
  queueCounters: {
    ...defaultDashboard.queueCounters,
    ...(safePayload.queueCounters || {}),
  },
  sessionStatuses: Array.isArray(safePayload.sessionStatuses) ? safePayload.sessionStatuses : defaultDashboard.sessionStatuses,
  moderatorWorkloads: Array.isArray(safePayload.moderatorWorkloads) ? safePayload.moderatorWorkloads : defaultDashboard.moderatorWorkloads,
  latestConversations: Array.isArray(safePayload.latestConversations) ? safePayload.latestConversations : defaultDashboard.latestConversations,
  slaSummary: {
    ...defaultDashboard.slaSummary,
    ...(safePayload.slaSummary || {}),
  },
  cachedAt: safePayload.cachedAt || defaultDashboard.cachedAt,
};
};

const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
  </div>
);

const ModeratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardResponse>(defaultDashboard);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<DashboardApiResponse>('/api/v1/moderator-dashboard', {
        params: selectedSession ? { sessionId: selectedSession } : undefined,
      });
      if (response.data?.success) {
        setDashboard(normalizeDashboardResponse(response.data));
      }
    } catch (err) {
      setError(translateInboxApiError(err, (key: string) => key, 'Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const formattedLastUpdated = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date(dashboard.cachedAt));
  }, [dashboard.cachedAt]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          لوحة تحكم المشرفين
        </h1>
        <div className="w-full max-w-xs">
          <select
            value={selectedSession}
            onChange={(event) => setSelectedSession(event.target.value)}
            className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">كل الأرقام</option>
            {dashboard.sessionStatuses.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name || session.phoneNumber}
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-muted-foreground">آخر تحديث: {formattedLastUpdated}</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="قيد الانتظار" value={dashboard.queueCounters.waiting} />
        <StatCard label="المسندة / النشطة" value={dashboard.queueCounters.assigned} />
        <StatCard label="معلقة" value={dashboard.queueCounters.pending} />
        <StatCard label="خرق SLA" value={dashboard.queueCounters.slaBreached} />
        <StatCard label="مودريتورز Online" value={dashboard.stats.onlineModerators} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">رادار الطوابير</h2>
            <div className="rounded-lg border border-border/50 bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
              الإجمالي: {dashboard.queueCounters.total}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ['مصعدة', dashboard.queueCounters.escalated, 'text-destructive'],
              ['معرضة للخطر', dashboard.queueCounters.slaAtRisk, 'text-amber-600'],
              ['محادثات فائتة', dashboard.queueCounters.missedChats, 'text-fuchsia-600'],
              ['غير مقروءة', dashboard.stats.unreadCount, 'text-foreground'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-lg border border-border/50 bg-muted p-4">
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">أرقام متصلة</h2>

          <div className="mt-4 space-y-2">
            {dashboard.sessionStatuses.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{session.name || session.phoneNumber}</div>
                  <div className="text-xs text-muted-foreground">{session.phoneNumber}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
            {dashboard.sessionStatuses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                لا توجد جلسات واتساب متاحة ضمن هذا النطاق حتى الآن.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">لوحة أحمال المودريتورز</h2>
          <div className="mt-4 space-y-2">
            {dashboard.moderatorWorkloads.map((moderator) => (
              <div key={moderator.userId} className="rounded-lg border border-border/50 bg-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{moderator.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {moderator.user.department || 'بدون قسم'} • {moderator.user.role}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      moderator.online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {moderator.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    ['مسندة', moderator.assigned],
                    ['معلقة', moderator.pending],
                    ['غير مقروءة', moderator.unread],
                    ['أغلقت اليوم', moderator.closedToday],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-border/50 bg-card px-3 py-2 text-center">
                      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
                      <div className="mt-0.5 text-lg font-bold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {dashboard.moderatorWorkloads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                لا توجد بيانات أحمال للمودريتورز حتى الآن.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">أحدث المحادثات</h2>
          <div className="mt-4 space-y-2">
            {dashboard.latestConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => navigate(`/whatsapp-chat/${conversation.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{conversation.customer.name}</div>
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">
                    {conversation.lastMessagePreview || 'لا يوجد معاينة بعد'}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {formatQueueLabel(conversation.queueKey, conversation.status)}
                </div>
              </button>
            ))}
            {dashboard.latestConversations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                لا توجد محادثات واتساب حديثة.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
