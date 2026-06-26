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
  'rounded-lg border px-4 py-3 text-sm shadow-sm';

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
    },
    {
      key: 'exclusive',
      label: t('whatsappInbox.workspaceExclusiveNumbers'),
      value: stats.exclusiveNumbers,
    },
    {
      key: 'roundRobin',
      label: t('whatsappInbox.workspaceRoundRobinNumbers'),
      value: stats.roundRobinNumbers,
    },
    {
      key: 'connected',
      label: t('whatsappInbox.workspaceConnectedNumbers'),
      value: stats.connectedNumbers,
    },
  ];

  if (loading) {
    return (
      <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="h-[540px] animate-pulse rounded-xl bg-muted" />
          <div className="h-[540px] animate-pulse rounded-xl bg-muted" />
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

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {t('whatsappInbox.workspaceTitle')}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate('/settings/inbox')}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                {t('whatsappInbox.openSettingsPage')}
              </button>
              <button
                onClick={() => void loadWorkspace(selectedSessionId)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                {t('whatsappInbox.refreshWorkspace')}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workspaceSummary.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-border/50 bg-card p-4 shadow-sm"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            <div className="border-b border-border/50 px-4 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t('whatsappInbox.workspaceNumbersTitle')}
              </h2>
            </div>

            <div className="max-h-[720px] space-y-2 overflow-y-auto p-3">
              {numbers.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
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
                    className={`w-full rounded-lg border p-3 text-start transition ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-border/50 bg-card hover:border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {displayName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                          {number.session.phoneNumber}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${resolveConnectionClasses(number.connectionStatus)}`}
                      >
                        {resolveConnectionLabel(number.connectionStatus)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {number.isConfigured
                          ? number.routingMode === 'NUMBER_OWNER'
                            ? t('whatsappInbox.modeDirect')
                            : t('whatsappInbox.modeRoundRobin')
                          : t('whatsappInbox.modeNotConfigured')}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
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

          <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            {!selectedNumber ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-muted p-4 text-2xl text-muted-foreground">
                  01
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">
                  {t('whatsappInbox.workspaceEmptyTitle')}
                </h2>
              </div>
            ) : (
              <div className="flex flex-col gap-5 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedNumber.session.name ||
                          selectedNumber.session.profileName ||
                          selectedNumber.session.phoneNumber}
                      </h2>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${resolveConnectionClasses(selectedNumber.connectionStatus)}`}
                      >
                        {resolveConnectionLabel(selectedNumber.connectionStatus)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground" dir="ltr">
                      {selectedNumber.session.phoneNumber}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted px-3 py-3 text-sm">
                    <p className="font-medium text-muted-foreground">
                      {t('whatsappInbox.lastDistribution')}
                    </p>
                    <p className="mt-1 text-foreground">
                      {lastDistributedUser
                        ? `${lastDistributedUser.firstName} ${lastDistributedUser.lastName}`
                        : t('whatsappInbox.notAvailable')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(selectedNumber.lastDistributedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('NUMBER_OWNER')}
                    className={`rounded-lg border p-4 text-start transition ${
                      routingMode === 'NUMBER_OWNER'
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-border/50 bg-card hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {t('whatsappInbox.modeDirect')}
                        </h3>
                      </div>
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                          routingMode === 'NUMBER_OWNER'
                            ? 'border-emerald-500 bg-[color:var(--color-card)]'
                            : 'border-border bg-transparent'
                        }`}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('ROUND_ROBIN')}
                    className={`rounded-lg border p-4 text-start transition ${
                      routingMode === 'ROUND_ROBIN'
                        ? 'border-amber-300 bg-amber-50 shadow-sm dark:border-amber-800 dark:bg-amber-950/20'
                        : 'border-border/50 bg-card hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {t('whatsappInbox.modeRoundRobin')}
                        </h3>
                      </div>
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                          routingMode === 'ROUND_ROBIN'
                            ? 'border-amber-500 bg-[color:var(--color-card)]'
                            : 'border-border bg-transparent'
                        }`}
                      />
                    </div>
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.4fr,0.9fr]">
                  <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                    <h3 className="text-base font-semibold text-foreground">
                      {t('whatsappInbox.workspaceEmployeesTitle')}
                    </h3>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {moderators.map((moderator) => {
                        const isSelected = selectedUserIds.includes(moderator.id);

                        return (
                          <button
                            key={moderator.id}
                            type="button"
                            onClick={() => toggleEmployee(moderator.id)}
                            className={`rounded-lg border p-3 text-start transition ${
                              isSelected
                                ? routingMode === 'NUMBER_OWNER'
                                  ? 'border-emerald-300 bg-card shadow-sm dark:border-emerald-800'
                                  : 'border-amber-300 bg-card shadow-sm dark:border-amber-800'
                                : 'border-border/50 bg-card hover:border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                {getInitials(
                                  moderator.firstName,
                                  moderator.lastName,
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {moderator.firstName} {moderator.lastName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {moderator.email}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {resolveRoleLabel(moderator.role)}
                              </span>
                              <span
                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-border text-muted-foreground'
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

                  <div className="space-y-3">
                    <div className="rounded-lg border border-border/50 bg-card p-4">
                      <h3 className="text-base font-semibold text-foreground">
                        {t('whatsappInbox.selectedEmployeesTitle')}
                      </h3>

                      {selectedUsers.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {t('whatsappInbox.selectedEmployeesEmpty')}
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selectedUsers.map((user) => (
                            <span
                              key={user.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground"
                            >
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-card text-[9px] font-bold text-primary">
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

                <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleUnassign}
                    disabled={saving || !selectedNumber.isConfigured}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('whatsappInbox.unassign')}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
