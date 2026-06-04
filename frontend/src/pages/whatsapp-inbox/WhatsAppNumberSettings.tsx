import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTranslation } from 'react-i18next';
import { translateInboxApiError } from './errorTranslation';

type RoutingMode = 'NUMBER_OWNER' | 'ROUND_ROBIN';

interface Moderator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar: string | null;
}

interface WorkspaceNumber {
  id: string;
  sessionId: string;
  assignmentId: string | null;
  isConfigured: boolean;
  connectionStatus: string;
  routingMode: RoutingMode;
  distributionStrategy: 'ROUND_ROBIN';
  assignedUser: Moderator | null;
  routingUsers: Moderator[];
  routingUserIds: string[];
  activeMemberCount: number;
  lastDistributedUserId: string | null;
  lastDistributedAt: string | null;
  roundRobinCursor: number;
  assignedAt: string | null;
  isActive: boolean;
  session: {
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    provider: string;
    profileName: string | null;
    lastConnectedAt: string | null;
    updatedAt?: string;
  };
}

interface WorkspaceStats {
  totalNumbers: number;
  configuredNumbers: number;
  exclusiveNumbers: number;
  roundRobinNumbers: number;
  connectedNumbers: number;
}

const ADMIN_ALERT_STYLES =
  'rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur';

const getInitials = (firstName = '', lastName = '') =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'U';

const WhatsAppNumberSettings: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const [numbers, setNumbers] = useState<WorkspaceNumber[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({
    totalNumbers: 0,
    configuredNumbers: 0,
    exclusiveNumbers: 0,
    roundRobinNumbers: 0,
    connectedNumbers: 0,
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessionId || null,
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>('NUMBER_OWNER');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadWorkspace = useCallback(
    async (preferredSessionId?: string | null) => {
      setFeedback(null);

      try {
        const response = await apiClient.get(
          '/api/v1/admin/whatsapp-numbers/workspace',
        );

        const nextNumbers: WorkspaceNumber[] = response.data?.numbers || [];
        const nextModerators: Moderator[] = response.data?.moderators || [];

        setNumbers(nextNumbers);
        setModerators(nextModerators);
        setStats(
          response.data?.stats || {
            totalNumbers: nextNumbers.length,
            configuredNumbers: 0,
            exclusiveNumbers: 0,
            roundRobinNumbers: 0,
            connectedNumbers: 0,
          },
        );

        setSelectedSessionId((currentSessionId) => {
          const desiredSessionId = preferredSessionId || currentSessionId;
          if (
            desiredSessionId &&
            nextNumbers.some((entry) => entry.sessionId === desiredSessionId)
          ) {
            return desiredSessionId;
          }

          return nextNumbers[0]?.sessionId || null;
        });
      } catch (error: unknown) {
        setFeedback({
          type: 'error',
          text: translateInboxApiError(
            error,
            t,
            'whatsappInbox.errors.routingWorkspaceLoad',
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadWorkspace(sessionId || null);
  }, [loadWorkspace, sessionId]);

  const selectedNumber = useMemo(
    () =>
      numbers.find((entry) => entry.sessionId === selectedSessionId) || null,
    [numbers, selectedSessionId],
  );

  useEffect(() => {
    if (!selectedNumber) {
      setRoutingMode('NUMBER_OWNER');
      setSelectedUserIds([]);
      return;
    }

    setRoutingMode(selectedNumber.routingMode);
    setSelectedUserIds(selectedNumber.routingUserIds);
  }, [
    selectedNumber?.routingMode,
    selectedNumber?.routingUserIds,
    selectedNumber?.sessionId,
  ]);

  const selectedUsers = useMemo(
    () =>
      moderators.filter((moderator) => selectedUserIds.includes(moderator.id)),
    [moderators, selectedUserIds],
  );

  const lastDistributedUser = useMemo(() => {
    if (!selectedNumber?.lastDistributedUserId) {
      return null;
    }

    return (
      moderators.find(
        (moderator) => moderator.id === selectedNumber.lastDistributedUserId,
      ) || null
    );
  }, [moderators, selectedNumber?.lastDistributedUserId]);

  const resolveConnectionLabel = (status: string) => {
    const labels: Record<string, string> = {
      CONNECTED: t('whatsappInbox.statusConnected'),
      DISCONNECTED: t('whatsappInbox.statusDisconnected'),
      CONNECTING: t('whatsappInbox.statusConnecting'),
      ERROR: t('whatsappInbox.statusError'),
    };

    return labels[status] || status;
  };

  const resolveConnectionClasses = (status: string) => {
    const styles: Record<string, string> = {
      CONNECTED:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
      DISCONNECTED:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
      CONNECTING:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
      ERROR:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
    };

    return (
      styles[status] ||
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    );
  };

  const resolveRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      AGENT: t('whatsappInbox.moderator'),
      MANAGER: t('whatsappInbox.teamLeader'),
      COMPANY_ADMIN: t('whatsappInbox.admin'),
      OWNER: t('whatsappInbox.owner'),
      SUPER_ADMIN: t('whatsappInbox.superAdmin'),
    };

    return labels[role] || role;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return t('whatsappInbox.notAvailable');
    }

    return new Date(value).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleSessionSelect = (nextSessionId: string) => {
    setSelectedSessionId(nextSessionId);
    setFeedback(null);
  };

  const handleModeChange = (nextMode: RoutingMode) => {
    setRoutingMode(nextMode);
    setFeedback(null);

    if (nextMode === 'NUMBER_OWNER' && selectedUserIds.length > 1) {
      setSelectedUserIds(selectedUserIds.slice(0, 1));
    }
  };

  const toggleEmployee = (userId: string) => {
    setFeedback(null);

    if (routingMode === 'NUMBER_OWNER') {
      setSelectedUserIds((current) =>
        current[0] === userId ? [] : [userId],
      );
      return;
    }

    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId],
    );
  };

  const handleSave = async () => {
    if (!selectedNumber) {
      return;
    }

    if (routingMode === 'NUMBER_OWNER' && selectedUserIds.length !== 1) {
      setFeedback({
        type: 'error',
        text: t('whatsappInbox.errors.directModeRequiresOneEmployee'),
      });
      return;
    }

    if (routingMode === 'ROUND_ROBIN' && selectedUserIds.length < 2) {
      setFeedback({
        type: 'error',
        text: t('whatsappInbox.errors.roundRobinRequiresTwoEmployees'),
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await apiClient.put(
        `/api/v1/admin/whatsapp-numbers/${selectedNumber.sessionId}/routing`,
        {
          routingMode,
          distributionStrategy: 'ROUND_ROBIN',
          userIds: selectedUserIds,
        },
      );

      setFeedback({
        type: 'success',
        text: t('whatsappInbox.routingSaved'),
      });

      await loadWorkspace(selectedNumber.sessionId);
    } catch (error: unknown) {
      setFeedback({
        type: 'error',
        text: translateInboxApiError(
          error,
          t,
          'whatsappInbox.errors.saveRoutingRule',
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!selectedNumber) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await apiClient.post('/api/v1/admin/whatsapp-numbers/unassign', {
        sessionId: selectedNumber.sessionId,
      });

      setFeedback({
        type: 'success',
        text: t('whatsappInbox.numberUnassigned'),
      });

      await loadWorkspace(selectedNumber.sessionId);
    } catch (error: unknown) {
      setFeedback({
        type: 'error',
        text: translateInboxApiError(
          error,
          t,
          'whatsappInbox.errors.unassignNumber',
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const workspaceSummary = [
    {
      key: 'configured',
      label: t('whatsappInbox.workspaceConfiguredNumbers'),
      value: stats.configuredNumbers,
      tone: 'from-emerald-500/15 to-emerald-100',
    },
    {
      key: 'exclusive',
      label: t('whatsappInbox.workspaceExclusiveNumbers'),
      value: stats.exclusiveNumbers,
      tone: 'from-sky-500/15 to-sky-100',
    },
    {
      key: 'roundRobin',
      label: t('whatsappInbox.workspaceRoundRobinNumbers'),
      value: stats.roundRobinNumbers,
      tone: 'from-amber-500/15 to-amber-100',
    },
    {
      key: 'connected',
      label: t('whatsappInbox.workspaceConnectedNumbers'),
      value: stats.connectedNumbers,
      tone: 'from-slate-500/10 to-slate-100',
    },
  ];

  if (loading) {
    return (
      <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="h-[540px] animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-slate-800" />
          <div className="h-[540px] animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {feedback && (
          <div
            className={`${ADMIN_ALERT_STYLES} ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_45%,#fefce8_100%)] p-6 shadow-[0_30px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#07111a_0%,#0f172a_50%,#172033_100%)] md:p-8">
          <div className="absolute inset-y-0 left-0 w-48 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_72%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70 dark:text-emerald-300">
                  {t('whatsappInbox.workspaceBadge')}
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                    {t('whatsappInbox.workspaceTitle')}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                    {t('whatsappInbox.workspaceDescription')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/settings/inbox')}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {t('whatsappInbox.openSettingsPage')}
                </button>
                <button
                  onClick={() => void loadWorkspace(selectedSessionId)}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                >
                  {t('whatsappInbox.refreshWorkspace')}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {workspaceSummary.map((item) => (
                <article
                  key={item.key}
                  className={`rounded-[24px] border border-white/70 bg-gradient-to-br ${item.tone} px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:from-slate-900/90 dark:to-slate-900/70`}
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('whatsappInbox.workspaceNumbersTitle')}
              </h2>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                {t('whatsappInbox.workspaceNumbersDescription')}
              </p>
            </div>

            <div className="max-h-[720px] space-y-3 overflow-y-auto p-4">
              {numbers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {t('whatsappInbox.workspaceNoNumbers')}
                </div>
              )}

              {numbers.map((number) => {
                const isSelected = number.sessionId === selectedSessionId;
                const displayName =
                  number.session.name ||
                  number.session.profileName ||
                  number.session.phoneNumber;

                return (
                  <button
                    key={number.sessionId}
                    onClick={() => handleSessionSelect(number.sessionId)}
                    className={`w-full rounded-[24px] border p-4 text-start transition ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-md dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {displayName}
                        </p>
                        <p
                          className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                          dir="ltr"
                        >
                          {number.session.phoneNumber}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${resolveConnectionClasses(number.connectionStatus)}`}
                      >
                        {resolveConnectionLabel(number.connectionStatus)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {number.isConfigured
                          ? number.routingMode === 'NUMBER_OWNER'
                            ? t('whatsappInbox.modeDirect')
                            : t('whatsappInbox.modeRoundRobin')
                          : t('whatsappInbox.modeNotConfigured')}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t('whatsappInbox.selectedEmployeesCount', {
                          count: number.routingUserIds.length,
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
            {!selectedNumber ? (
              <div className="flex min-h-[620px] flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-emerald-100 p-5 text-3xl dark:bg-emerald-950/30">
                  01
                </div>
                <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
                  {t('whatsappInbox.workspaceEmptyTitle')}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {t('whatsappInbox.workspaceEmptyDescription')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        {selectedNumber.session.name ||
                          selectedNumber.session.profileName ||
                          selectedNumber.session.phoneNumber}
                      </h2>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${resolveConnectionClasses(selectedNumber.connectionStatus)}`}
                      >
                        {resolveConnectionLabel(selectedNumber.connectionStatus)}
                      </span>
                    </div>
                    <div
                      className="text-sm text-slate-500 dark:text-slate-400"
                      dir="ltr"
                    >
                      {selectedNumber.session.phoneNumber}
                    </div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {t('whatsappInbox.workspaceEditorDescription')}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      {t('whatsappInbox.lastDistribution')}
                    </p>
                    <p className="mt-2 text-slate-900 dark:text-white">
                      {lastDistributedUser
                        ? `${lastDistributedUser.firstName} ${lastDistributedUser.lastName}`
                        : t('whatsappInbox.notAvailable')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(selectedNumber.lastDistributedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('NUMBER_OWNER')}
                    className={`rounded-[26px] border p-5 text-start transition ${
                      routingMode === 'NUMBER_OWNER'
                        ? 'border-emerald-300 bg-emerald-50 shadow-md dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {t('whatsappInbox.modeDirect')}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {t('whatsappInbox.modeDirectDescription')}
                        </p>
                      </div>
                      <span
                        className={`h-5 w-5 rounded-full border-4 ${
                          routingMode === 'NUMBER_OWNER'
                            ? 'border-emerald-500 bg-white'
                            : 'border-slate-300 bg-transparent dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('ROUND_ROBIN')}
                    className={`rounded-[26px] border p-5 text-start transition ${
                      routingMode === 'ROUND_ROBIN'
                        ? 'border-amber-300 bg-amber-50 shadow-md dark:border-amber-800 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {t('whatsappInbox.modeRoundRobin')}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {t('whatsappInbox.modeRoundRobinDescription')}
                        </p>
                      </div>
                      <span
                        className={`h-5 w-5 rounded-full border-4 ${
                          routingMode === 'ROUND_ROBIN'
                            ? 'border-amber-500 bg-white'
                            : 'border-slate-300 bg-transparent dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </button>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t('whatsappInbox.workspaceEmployeesTitle')}
                      </h3>
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {routingMode === 'NUMBER_OWNER'
                          ? t('whatsappInbox.workspaceEmployeesDirectHint')
                          : t('whatsappInbox.workspaceEmployeesRoundRobinHint')}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {moderators.map((moderator) => {
                        const isSelected = selectedUserIds.includes(moderator.id);

                        return (
                          <button
                            key={moderator.id}
                            type="button"
                            onClick={() => toggleEmployee(moderator.id)}
                            className={`rounded-[24px] border p-4 text-start transition ${
                              isSelected
                                ? routingMode === 'NUMBER_OWNER'
                                  ? 'border-emerald-300 bg-white shadow-md dark:border-emerald-800 dark:bg-slate-950'
                                  : 'border-amber-300 bg-white shadow-md dark:border-amber-800 dark:bg-slate-950'
                                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-black text-white">
                                {getInitials(
                                  moderator.firstName,
                                  moderator.lastName,
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {moderator.firstName} {moderator.lastName}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {moderator.email}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {resolveRoleLabel(moderator.role)}
                              </span>
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-slate-300 text-slate-400 dark:border-slate-700'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t('whatsappInbox.privacySummaryTitle')}
                      </h3>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        <p>{t('whatsappInbox.privacySummaryIntro')}</p>
                        <p>
                          {routingMode === 'NUMBER_OWNER'
                            ? t('whatsappInbox.privacySummaryDirect')
                            : t('whatsappInbox.privacySummaryRoundRobin')}
                        </p>
                        <p>{t('whatsappInbox.privacySummaryFooter')}</p>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t('whatsappInbox.selectedEmployeesTitle')}
                      </h3>

                      {selectedUsers.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                          {t('whatsappInbox.selectedEmployeesEmpty')}
                        </p>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedUsers.map((user) => (
                            <span
                              key={user.id}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-emerald-700 dark:bg-slate-700 dark:text-emerald-300">
                                {getInitials(user.firstName, user.lastName)}
                              </span>
                              <span>
                                {user.firstName} {user.lastName}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleUnassign}
                    disabled={saving || !selectedNumber.isConfigured}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/20"
                  >
                    {t('whatsappInbox.unassign')}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? t('whatsappInbox.savingRouting')
                      : t('whatsappInbox.saveRouting')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNumberSettings;
