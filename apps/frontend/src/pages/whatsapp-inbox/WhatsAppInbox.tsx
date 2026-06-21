import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socketService';
import { formatQueueLabel, formatWorkflowStatus } from './queuePresentation';
import { getWhatsAppInboxWorkspaceCopy } from './workspaceCopy';

type Session = {
  id: string;
  name: string;
  phoneNumber: string;
  status: string;
};

type QueueCounters = {
  total: number;
  waiting: number;
  assigned: number;
  pending: number;
  closed: number;
  escalated: number;
  slaBreached: number;
  missedChats: number;
};

type ModeratorPoolItem = {
  id: string;
  name: string;
  department: string | null;
  online: boolean;
  workload: {
    active: number;
    pending: number;
    waitingCustomer: number;
    unread: number;
    totalWeighted: number;
  };
};

type Conversation = {
  id: string;
  status: string;
  queueKey?: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isRead: boolean;
  customer: {
    id: string;
    name: string;
    phone: string;
    avatar: string | null;
    status: string | null;
  };
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    department: string | null;
  } | null;
  flags: {
    detectedLanguage: string | null;
    detectedCountry: string | null;
    detectedDepartment: string | null;
  };
};

type SessionsApiResponse = {
  success: boolean;
  sessions: Session[];
};

type ConversationsApiResponse = {
  success: boolean;
  conversations: Conversation[];
  summary?: {
    queueCounters?: QueueCounters | null;
    moderatorPool?: ModeratorPoolItem[];
  };
};

type QueueFilter = '' | 'WAITING_QUEUE' | 'ASSIGNED_QUEUE' | 'PENDING_QUEUE' | 'CLOSED_QUEUE';

const getSessionTone = (status: string) =>
  String(status || '').toUpperCase() === 'CONNECTED'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200';

const WhatsAppInbox: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = useMemo(() => getWhatsAppInboxWorkspaceCopy(i18n.language), [i18n.language]);

  const queueTabs = useMemo<Array<{ key: QueueFilter; label: string }>>(
    () => [
      { key: '', label: copy.inbox.queueTabs.all },
      { key: 'WAITING_QUEUE', label: copy.inbox.queueTabs.waiting },
      { key: 'ASSIGNED_QUEUE', label: copy.inbox.queueTabs.assigned },
      { key: 'PENDING_QUEUE', label: copy.inbox.queueTabs.pending },
      { key: 'CLOSED_QUEUE', label: copy.inbox.queueTabs.closed },
    ],
    [copy],
  );

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(sessionId || null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [queueCounters, setQueueCounters] = useState<QueueCounters | null>(null);
  const [moderatorPool, setModeratorPool] = useState<ModeratorPoolItem[]>([]);
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessionsError = copy.isArabic
    ? 'تعذر تحميل أرقام واتساب الآن.'
    : 'We could not load WhatsApp numbers right now.';
  const loadConversationsError = copy.isArabic
    ? 'تعذر تحميل المحادثات الآن.'
    : 'We could not load inbox conversations right now.';

  const formatSessionStatus = useCallback(
    (status: string) =>
      String(status || '').toUpperCase() === 'CONNECTED' ? copy.common.online : copy.common.offline,
    [copy],
  );

  const formatMessageTime = useCallback(
    (value?: string | null) => {
      if (!value) {
        return null;
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      const now = new Date();
      const sameDay = now.toDateString() === date.toDateString();
      return new Intl.DateTimeFormat(copy.locale, sameDay
        ? { hour: 'numeric', minute: '2-digit' }
        : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
    },
    [copy.locale],
  );

  const loadSessions = useCallback(async () => {
    try {
      const response = await apiClient.get<SessionsApiResponse>('/api/v1/whatsapp-inbox/sessions');
      if (response.data?.success) {
        const nextSessions = response.data.sessions || [];
        setSessions(nextSessions);
        setError(null);
        if (!activeSession && nextSessions.length > 0) {
          setActiveSession(nextSessions[0]!.id);
        }
      }
    } catch (requestError) {
      console.error('Failed to load WhatsApp sessions:', requestError);
      setError(loadSessionsError);
    }
  }, [activeSession, loadSessionsError]);

  const loadConversations = useCallback(async () => {
    if (!activeSession) {
      setConversations([]);
      setQueueCounters(null);
      setModeratorPool([]);
      return;
    }

    try {
      const response = await apiClient.get<ConversationsApiResponse>(
        `/api/v1/whatsapp-inbox/sessions/${activeSession}/conversations`,
        {
          params: {
            limit: 100,
            search: search || undefined,
            queue: queueFilter || undefined,
          },
        },
      );

      if (response.data?.success) {
        setConversations(response.data.conversations || []);
        setQueueCounters(response.data.summary?.queueCounters || null);
        setModeratorPool(response.data.summary?.moderatorPool || []);
        setError(null);
      }
    } catch (requestError) {
      console.error('Failed to load WhatsApp inbox conversations:', requestError);
      setError(loadConversationsError);
    }
  }, [activeSession, loadConversationsError, queueFilter, search]);

  useEffect(() => {
    setActiveSession(sessionId || null);
  }, [sessionId]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadSessions();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadSessions]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const refresh = () => {
      void loadConversations();
    };

    socketService.on('conversation:updated', refresh);
    socketService.on('conversation:assignment', refresh);
    socketService.on('whatsapp:message:new', refresh);
    socketService.on('whatsapp:message:sent', refresh);

    return () => {
      socketService.off('conversation:updated', refresh);
      socketService.off('conversation:assignment', refresh);
      socketService.off('whatsapp:message:new', refresh);
      socketService.off('whatsapp:message:sent', refresh);
    };
  }, [loadConversations]);

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === activeSession) || null,
    [sessions, activeSession],
  );

  const heroMetrics = useMemo(
    () => [
      { label: copy.inbox.metrics.waiting, value: queueCounters?.waiting || 0 },
      { label: copy.inbox.metrics.assigned, value: queueCounters?.assigned || 0 },
      { label: copy.inbox.metrics.pending, value: queueCounters?.pending || 0 },
      { label: copy.inbox.metrics.slaBreached, value: queueCounters?.slaBreached || 0 },
    ],
    [copy, queueCounters],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
      </div>
    );
  }

  return (
    <div
      dir={copy.isArabic ? 'rtl' : 'ltr'}
      className="flex h-[calc(100vh-64px)] overflow-y-auto bg-slate-100 dark:bg-slate-950"
    >
      <aside className="hidden w-80 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {copy.inbox.railEyebrow}
          </div>
          <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
            {copy.inbox.railTitle}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {sessions.map((item) => {
            const active = item.id === activeSession;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                    setActiveSession(item.id);
                    navigate(superAdminMode ? `/super-admin/whatsapp/companies/${companyId}/inbox/${item.id}` : `/whatsapp-inbox/${item.id}`);
                  }}
                  className={`mb-2 w-full rounded-3xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-50 shadow-sm dark:border-cyan-500/50 dark:bg-cyan-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950 dark:text-white">
                      {item.name || item.phoneNumber}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.phoneNumber}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getSessionTone(item.status)}`}>
                    {formatSessionStatus(item.status)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <section className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-5 py-6 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                  {copy.inbox.heroEyebrow}
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {selectedSession?.name || selectedSession?.phoneNumber || copy.inbox.heroFallbackTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  {copy.inbox.heroDescription}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-center"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                      {metric.label}
                    </div>
                    <div className="mt-1 text-2xl font-black text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 lg:hidden">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {copy.inbox.railEyebrow}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sessions.map((item) => {
                const active = item.id === activeSession;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSession(item.id);
                      navigate(superAdminMode ? `/super-admin/whatsapp/companies/${companyId}/inbox/${item.id}` : `/whatsapp-inbox/${item.id}`);
                    }}
                    className={`min-w-[220px] rounded-3xl border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300 bg-cyan-50 shadow-sm dark:border-cyan-500/50 dark:bg-cyan-950/20'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="truncate font-semibold text-slate-950 dark:text-white">
                      {item.name || item.phoneNumber}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.phoneNumber}</div>
                    <div className="mt-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getSessionTone(item.status)}`}>
                        {formatSessionStatus(item.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[1fr,360px]">
          <section className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              {error ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void loadConversations();
                      }
                    }}
                    placeholder={copy.inbox.searchPlaceholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void loadConversations();
                    }}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                  >
                    {copy.inbox.refresh}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(superAdminMode ? `/super-admin/whatsapp/companies/${companyId}/moderator-dashboard` : '/moderator-dashboard')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {copy.inbox.openDashboard}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {queueTabs.map((tab) => (
                  <button
                    key={tab.key || 'all'}
                    type="button"
                    onClick={() => setQueueFilter(tab.key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      queueFilter === tab.key
                        ? 'bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
              {conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {copy.inbox.emptyStateTitle}
                  </div>
                  <div className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    {copy.inbox.emptyStateDescription}
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const messageTime = formatMessageTime(conversation.lastMessageAt);

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => navigate(superAdminMode ? `/super-admin/whatsapp/companies/${companyId}/chat/${conversation.id}` : `/whatsapp-chat/${conversation.id}`)}
                      className="mb-3 w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-500/60 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-950 dark:text-white">
                            {conversation.customer.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {conversation.customer.phone}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                            {formatQueueLabel(conversation.queueKey, conversation.status, i18n.language)}
                          </span>
                          {messageTime ? (
                            <span className="text-[11px] text-slate-400">{messageTime}</span>
                          ) : null}
                          {!conversation.isRead ? (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {conversation.unreadCount || 1}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 truncate text-sm text-slate-600 dark:text-slate-300">
                        {conversation.lastMessagePreview || copy.inbox.previewFallback}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                          {formatWorkflowStatus(conversation.status, i18n.language)}
                        </span>
                        {conversation.assignedUser ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {`${conversation.assignedUser.firstName} ${conversation.assignedUser.lastName}`.trim()}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                            {copy.common.unassigned}
                          </span>
                        )}
                        {conversation.customer.status === 'VIP' ? (
                          <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">
                            {copy.common.vip}
                          </span>
                        ) : null}
                        {conversation.flags.detectedLanguage ? (
                          <span>{conversation.flags.detectedLanguage.toUpperCase()}</span>
                        ) : null}
                        {conversation.flags.detectedCountry ? <span>{conversation.flags.detectedCountry}</span> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <aside className="hidden min-h-0 flex-col bg-white dark:bg-slate-900 xl:flex">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {copy.inbox.moderatorPoolEyebrow}
              </div>
              <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                {copy.inbox.moderatorPoolTitle}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {moderatorPool.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {copy.inbox.moderatorPoolEmpty}
                </div>
              ) : (
                moderatorPool.map((moderator) => (
                  <div
                    key={moderator.id}
                    className="mb-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950 dark:text-white">{moderator.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {moderator.department || copy.common.noDepartment}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          moderator.online
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {moderator.online ? copy.common.online : copy.common.offline}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white px-3 py-3 dark:bg-slate-900">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          {copy.common.active}
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                          {moderator.workload.active}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 dark:bg-slate-900">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          {copy.common.pending}
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                          {moderator.workload.pending}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppInbox;
