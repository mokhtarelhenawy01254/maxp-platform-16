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
  window: {
    isOpen: boolean;
    remainingSeconds: number;
    remainingLabel: string;
    windowExpiresAt: string | null;
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

type QueueFilter = '' | 'WAITING_QUEUE' | 'ASSIGNED_QUEUE' | 'PENDING_QUEUE' | 'CLOSED_QUEUE' | 'ESCALATED_QUEUE' | 'MISSED_QUEUE';

interface WhatsAppInboxProps {
  companyId?: string;
  superAdminMode?: boolean;
}

const getSessionTone = (status: string) =>
  String(status || '').toUpperCase() === 'CONNECTED'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
    : 'bg-muted text-muted-foreground';

const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({ companyId, superAdminMode = false }) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = useMemo(() => getWhatsAppInboxWorkspaceCopy(i18n.language), [i18n.language]);

  const apiBase = useMemo(
    () => (superAdminMode ? '/api/v1/admin/whatsapp-inbox' : '/api/v1/whatsapp-inbox'),
    [superAdminMode],
  );

  const apiParams = useMemo(
    () => (superAdminMode && companyId ? { params: { companyId } } : undefined),
    [superAdminMode, companyId],
  );

  const queueTabs = useMemo<Array<{ key: QueueFilter; label: string; metricKey?: keyof QueueCounters }>>(
    () => [
      { key: '', label: copy.inbox.queueTabs.all, metricKey: 'total' },
      { key: 'WAITING_QUEUE', label: copy.inbox.queueTabs.waiting, metricKey: 'waiting' },
      { key: 'ASSIGNED_QUEUE', label: copy.inbox.queueTabs.assigned, metricKey: 'assigned' },
      { key: 'PENDING_QUEUE', label: copy.inbox.queueTabs.pending, metricKey: 'pending' },
      { key: 'CLOSED_QUEUE', label: copy.inbox.queueTabs.closed, metricKey: 'closed' },
      { key: 'ESCALATED_QUEUE', label: copy.inbox.queueTabs.escalated, metricKey: 'escalated' },
      { key: 'MISSED_QUEUE', label: copy.inbox.queueTabs.missed, metricKey: 'missedChats' },
    ],
    [copy],
  );

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(sessionId || null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [queueCounters, setQueueCounters] = useState<QueueCounters | null>(null);
  const [moderatorPool, setModeratorPool] = useState<ModeratorPoolItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
      const response = await apiClient.get<SessionsApiResponse>(`${apiBase}/sessions`, apiParams);
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
  }, [activeSession, apiBase, apiParams, loadSessionsError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadConversations();
  }, [debouncedSearch, loadConversations]);

  const loadConversations = useCallback(async () => {
    if (!activeSession) {
      setConversations([]);
      setQueueCounters(null);
      setModeratorPool([]);
      return;
    }

    try {
      const params = {
        limit: 100,
        search: debouncedSearch || undefined,
        queue: queueFilter || undefined,
        ...(superAdminMode && companyId ? { companyId } : {}),
      };
      const response = await apiClient.get<ConversationsApiResponse>(
        `${apiBase}/sessions/${activeSession}/conversations`,
        { params },
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
  }, [activeSession, apiBase, companyId, debouncedSearch, loadConversationsError, queueFilter, superAdminMode]);

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

  const navigateToInbox = useCallback(
    (nextSessionId: string) => {
      if (superAdminMode && companyId) {
        navigate(`/super-admin/whatsapp/companies/${companyId}/inbox/${nextSessionId}`);
      } else {
        navigate(`/whatsapp-inbox/${nextSessionId}`);
      }
    },
    [companyId, navigate, superAdminMode],
  );

  const navigateToChat = useCallback(
    (conversationId: string) => {
      if (superAdminMode && companyId) {
        navigate(`/super-admin/whatsapp/companies/${companyId}/chat/${conversationId}`);
      } else {
        navigate(`/whatsapp-chat/${conversationId}`);
      }
    },
    [companyId, navigate, superAdminMode],
  );

  const navigateToDashboard = useCallback(() => {
    if (superAdminMode && companyId) {
      navigate(`/super-admin/whatsapp/companies/${companyId}/moderator-dashboard`);
    } else {
      navigate('/moderator-dashboard');
    }
  }, [companyId, navigate, superAdminMode]);

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
      { label: copy.inbox.metrics.missed, value: queueCounters?.missedChats || 0 },
      { label: copy.inbox.metrics.escalated, value: queueCounters?.escalated || 0 },
    ],
    [copy, queueCounters],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500 dark:border-slate-600 dark:border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div
      dir={copy.isArabic ? 'rtl' : 'ltr'}
      className="flex h-[calc(100vh-64px)] overflow-y-auto bg-background"
    >
      <aside className="hidden w-72 flex-col border-r border-border/50 bg-card lg:flex">
        <div className="border-b border-border/50 px-4 py-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {copy.inbox.railEyebrow}
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">
            {copy.inbox.railTitle}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
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
                  className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-border/50 bg-card hover:border-border'
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {item.name || item.phoneNumber}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.phoneNumber}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getSessionTone(item.status)}`}>
                    {formatSessionStatus(item.status)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <section className="border-b border-border/50 bg-card px-4 py-3 md:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {selectedSession?.name || selectedSession?.phoneNumber || copy.inbox.heroFallbackTitle}
              </h1>
              <div className="flex flex-wrap gap-2">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-border/50 bg-muted px-3 py-2 text-center"
                  >
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-foreground">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 lg:hidden">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {copy.inbox.railEyebrow}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sessions.map((item) => {
                const active = item.id === activeSession;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSession(item.id);
                      navigateToInbox(item.id);
                    }}
                    className={`min-w-[200px] rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? 'border-primary/30 bg-primary/5 shadow-sm'
                        : 'border-border/50 bg-card'
                    }`}
                  >
                    <div className="truncate text-sm font-medium text-foreground">
                      {item.name || item.phoneNumber}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.phoneNumber}</div>
                    <div className="mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getSessionTone(item.status)}`}>
                        {formatSessionStatus(item.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[1fr,320px]">
          <section className="flex min-h-0 flex-col border-r border-border/50 bg-background">
            <div className="border-b border-border/50 bg-card px-4 py-3 md:px-5">
              {error ? (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 gap-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void loadConversations();
                      }
                    }}
                    placeholder={copy.inbox.searchPlaceholder}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={() => loadConversations()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    {copy.inbox.refresh}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToDashboard()}
                  className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  {copy.inbox.openDashboard}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {queueTabs.map((tab) => (
                  <button
                    key={tab.key || 'all'}
                    type="button"
                    onClick={() => setQueueFilter(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      queueFilter === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {tab.label}
                    {tab.metricKey && (queueCounters?.[tab.metricKey] ?? 0) > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0 text-[11px] font-semibold ${
                          queueFilter === tab.key
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {queueCounters?.[tab.metricKey]}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
              {conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 text-center">
                  <div className="text-base font-semibold text-foreground">
                    {copy.inbox.emptyStateTitle}
                  </div>
                  <div className="mt-1 max-w-md text-sm text-muted-foreground">
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
                      onClick={() => navigateToChat(conversation.id)}
                      className="mb-2 w-full rounded-lg border border-border/50 bg-card p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {conversation.customer.name}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {conversation.customer.phone}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                            {formatQueueLabel(conversation.queueKey, conversation.status, i18n.language)}
                          </span>
                          {messageTime ? (
                            <span className="text-[11px] text-muted-foreground">{messageTime}</span>
                          ) : null}
                          {!conversation.isRead ? (
                            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                              {conversation.unreadCount || 1}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 truncate text-sm text-muted-foreground">
                        {conversation.lastMessagePreview || copy.inbox.previewFallback}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {formatWorkflowStatus(conversation.status, i18n.language)}
                        </span>
                        {conversation.assignedUser ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {`${conversation.assignedUser.firstName} ${conversation.assignedUser.lastName}`.trim()}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                            {copy.common.unassigned}
                          </span>
                        )}
                        {conversation.customer.status === 'VIP' ? (
                          <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-200">
                            {copy.common.vip}
                          </span>
                        ) : null}
                        {conversation.window?.isOpen ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                            ⏱ {conversation.window.remainingLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-200">
                            ✕ {conversation.window.remainingLabel}
                          </span>
                        )}
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

          <aside className="hidden min-h-0 flex-col bg-card xl:flex">
            <div className="border-b border-border/50 px-4 py-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.inbox.moderatorPoolEyebrow}
              </div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {copy.inbox.moderatorPoolTitle}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {moderatorPool.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  {copy.inbox.moderatorPoolEmpty}
                </div>
              ) : (
                moderatorPool.map((moderator) => (
                  <div
                    key={moderator.id}
                    className="mb-2 rounded-lg border border-border/50 bg-muted/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-foreground">{moderator.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {moderator.department || copy.common.noDepartment}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          moderator.online
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {moderator.online ? copy.common.online : copy.common.offline}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-card px-3 py-2">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          {copy.common.active}
                        </div>
                        <div className="mt-0.5 text-lg font-bold text-foreground">
                          {moderator.workload.active}
                        </div>
                      </div>
                      <div className="rounded-lg bg-card px-3 py-2">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          {copy.common.pending}
                        </div>
                        <div className="mt-0.5 text-lg font-bold text-foreground">
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
