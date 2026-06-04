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
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className={`h-1 w-16 rounded-full ${accent}`} />
    <div className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</div>
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
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-7 text-white shadow-[0_25px_80px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
              عمليات مباشرة
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              لوحة تحكم المشرفين
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/75 md:text-base">
              راقب المحادثات الحالية، ضغط كل مودريتور، الـ SLA breaches، والأرقام المتصلة لحظة بلحظة.
            </p>
          </div>
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">نطاق الجلسة</div>
            <select
              value={selectedSession}
              onChange={(event) => setSelectedSession(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm font-medium text-white outline-none focus:border-cyan-300/60"
            >
              <option value="">كل الأرقام</option>
              {dashboard.sessionStatuses.map((session) => (
                <option key={session.id} value={session.id} className="text-slate-950">
                  {session.name || session.phoneNumber}
                </option>
              ))}
            </select>
            <div className="mt-3 text-xs text-white/65">تحديث مباشر كل 30 ثانية • آخر تحديث: {formattedLastUpdated}</div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="قيد الانتظار" value={dashboard.queueCounters.waiting} accent="bg-amber-400" />
        <StatCard label="المسندة / النشطة" value={dashboard.queueCounters.assigned} accent="bg-cyan-400" />
        <StatCard label="معلقة" value={dashboard.queueCounters.pending} accent="bg-indigo-400" />
        <StatCard label="خرق SLA" value={dashboard.queueCounters.slaBreached} accent="bg-rose-400" />
        <StatCard label="مودريتورز Online" value={dashboard.stats.onlineModerators} accent="bg-emerald-400" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">رادار الطوابير</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                توزيع الـ queues الحالية ومؤشرات الخطر.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              الإجمالي: {dashboard.queueCounters.total}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['مصعدة', dashboard.queueCounters.escalated, 'text-rose-600'],
              ['معرضة للخطر', dashboard.queueCounters.slaAtRisk, 'text-amber-600'],
              ['محادثات فائتة', dashboard.queueCounters.missedChats, 'text-fuchsia-600'],
              ['غير مقروءة', dashboard.stats.unreadCount, 'text-slate-800'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
                <div className={`mt-2 text-3xl font-black ${tone}`}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">أرقام متصلة</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">الحالة المباشرة لكل رقم واتساب.</p>
          </div>

          <div className="mt-5 space-y-3">
            {dashboard.sessionStatuses.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{session.name || session.phoneNumber}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{session.phoneNumber}</div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    session.isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200'
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
            {dashboard.sessionStatuses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                لا توجد جلسات واتساب متاحة ضمن هذا النطاق حتى الآن.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">لوحة أحمال المودريتورز</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">من عليه ضغط حاليًا ومن متاح للاستلام.</p>
          </div>
          <div className="mt-5 space-y-3">
            {dashboard.moderatorWorkloads.map((moderator) => (
              <div key={moderator.userId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{moderator.user.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {moderator.user.department || 'بدون قسم'} • {moderator.user.role}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      moderator.online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {moderator.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    ['مسندة', moderator.assigned],
                    ['معلقة', moderator.pending],
                    ['غير مقروءة', moderator.unread],
                    ['أغلقت اليوم', moderator.closedToday],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
                      <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {dashboard.moderatorWorkloads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                لا توجد بيانات أحمال للمودريتورز حتى الآن.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">أحدث المحادثات</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">آخر المحادثات الجارية داخل الـ inbox.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {dashboard.latestConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => navigate(`/whatsapp-chat/${conversation.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-500/60 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white">{conversation.customer.name}</div>
                  <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {conversation.lastMessagePreview || 'لا يوجد معاينة بعد'}
                  </div>
                </div>
                <div className="ml-4 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                  {formatQueueLabel(conversation.queueKey, conversation.status)}
                </div>
              </button>
            ))}
            {dashboard.latestConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
