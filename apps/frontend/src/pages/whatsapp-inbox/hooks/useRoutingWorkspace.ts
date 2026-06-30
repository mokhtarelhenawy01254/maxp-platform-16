import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../services/apiClient';
import { translateInboxApiError } from '../errorTranslation';
import type {
  Employee,
  Feedback,
  InboxSettings,
  PreviewResult,
  RoutingMode,
  WorkspaceNumber,
  WorkspaceStats,
} from '../types';

const DEFAULT_SETTINGS: InboxSettings = {
  defaultChatStatus: 'NEW',
  autoCloseEnabled: false,
  autoCloseAfterMin: 30,
  archiveAfterDays: 30,
  retentionDays: 90,
  maxChatsPerModerator: 50,
  allowTransfer: true,
  requireNoteOnClose: false,
  notifyOnNewChat: true,
  notifyOnTransfer: true,
  notifyOnClose: false,
  browserPushEnabled: true,
  soundEnabled: true,
  soundUrl: '/sounds/notification.mp3',
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingDays: 'SAT,SUN,MON,TUE,WED,THU',
};

const EMPTY_STATS: WorkspaceStats = {
  totalNumbers: 0,
  configuredNumbers: 0,
  exclusiveNumbers: 0,
  roundRobinNumbers: 0,
  connectedNumbers: 0,
};

export interface UseRoutingWorkspace {
  numbers: WorkspaceNumber[];
  employees: Employee[];
  stats: WorkspaceStats;
  settings: InboxSettings;
  selectedSessionId: string | null;
  selectedNumber: WorkspaceNumber | null;
  routingMode: RoutingMode;
  selectedEmployeeIds: string[];
  employeeLookup: Record<string, Employee>;
  loading: boolean;
  saving: boolean;
  settingsSaving: boolean;
  feedback: Feedback | null;
  previewResult: PreviewResult | null;
  dirty: boolean;
  loadWorkspace: (preferredSessionId?: string | null) => Promise<void>;
  loadSettings: () => Promise<void>;
  handleSessionSelect: (sessionId: string) => void;
  handleModeChange: (mode: RoutingMode) => void;
  toggleEmployee: (employeeId: string) => void;
  handleSelectAll: (employeeIds: string[]) => void;
  handleSave: () => Promise<void>;
  handleUnassign: () => Promise<void>;
  handleSaveSettings: (settings: InboxSettings) => Promise<void>;
  clearFeedback: () => void;
  setPreviewResult: (result: PreviewResult | null) => void;
}

export const useRoutingWorkspace = (): UseRoutingWorkspace => {
  const { sessionId } = useParams();
  const { t } = useTranslation();

  const [numbers, setNumbers] = useState<WorkspaceNumber[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>(EMPTY_STATS);
  const [settings, setSettings] = useState<InboxSettings>(DEFAULT_SETTINGS);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessionId || null,
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>('NUMBER_OWNER');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  const loadWorkspace = useCallback(
    async (preferredSessionId?: string | null) => {
      setFeedback(null);

      try {
        const response = await apiClient.get<{
          numbers?: WorkspaceNumber[];
          moderators?: Employee[];
          stats?: WorkspaceStats;
        }>('/api/v1/admin/whatsapp-numbers/workspace');

        const nextNumbers: WorkspaceNumber[] = response.data?.numbers || [];
        const nextEmployees: Employee[] = response.data?.moderators || [];

        setNumbers(nextNumbers);
        setEmployees(nextEmployees);
        setStats(response.data?.stats || EMPTY_STATS);

        setSelectedSessionId((current) => {
          const desired = preferredSessionId || current;
          if (
            desired &&
            nextNumbers.some((entry) => entry.sessionId === desired)
          ) {
            return desired;
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

  const loadSettings = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success?: boolean;
        settings?: Partial<InboxSettings>;
      }>('/api/v1/inbox-settings');
      if (response.data?.success && response.data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data.settings });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(sessionId || null);
    void loadSettings();
  }, [loadWorkspace, loadSettings, sessionId]);

  const selectedNumber = useMemo(
    () =>
      numbers.find((entry) => entry.sessionId === selectedSessionId) || null,
    [numbers, selectedSessionId],
  );

  useEffect(() => {
    if (!selectedNumber) {
      setRoutingMode('NUMBER_OWNER');
      setSelectedEmployeeIds([]);
      return;
    }
    setRoutingMode(selectedNumber.routingMode);
    setSelectedEmployeeIds(selectedNumber.routingUserIds);
    setPreviewResult(null);
  }, [selectedNumber]);

  const employeeLookup = useMemo(
    () =>
      employees.reduce<Record<string, Employee>>((map, employee) => {
        map[employee.id] = employee;
        return map;
      }, {}),
    [employees],
  );

  const dirty = useMemo(() => {
    if (!selectedNumber) return false;
    if (selectedNumber.routingMode !== routingMode) return true;
    const current = [...selectedNumber.routingUserIds].sort();
    const next = [...selectedEmployeeIds].sort();
    return JSON.stringify(current) !== JSON.stringify(next);
  }, [selectedNumber, routingMode, selectedEmployeeIds]);

  const handleSessionSelect = useCallback(
    (nextSessionId: string) => {
      setSelectedSessionId(nextSessionId);
      setFeedback(null);
    },
    [],
  );

  const handleModeChange = useCallback((nextMode: RoutingMode) => {
    setRoutingMode(nextMode);
    setFeedback(null);
    setPreviewResult(null);

    if (nextMode === 'NUMBER_OWNER' && selectedEmployeeIds.length > 1) {
      setSelectedEmployeeIds((current) => current.slice(0, 1));
    }
  }, [selectedEmployeeIds.length]);

  const handleSelectAll = useCallback((employeeIds: string[]) => {
    setFeedback(null);
    setPreviewResult(null);
    if (routingMode === 'NUMBER_OWNER') {
      setSelectedEmployeeIds(employeeIds.length > 0 ? [employeeIds[0]] : []);
    } else {
      setSelectedEmployeeIds(employeeIds);
    }
  }, [routingMode]);

  const toggleEmployee = useCallback(
    (employeeId: string) => {
      setFeedback(null);
      setPreviewResult(null);

      if (routingMode === 'NUMBER_OWNER') {
        setSelectedEmployeeIds((current) =>
          current[0] === employeeId ? [] : [employeeId],
        );
        return;
      }

      setSelectedEmployeeIds((current) =>
        current.includes(employeeId)
          ? current.filter((entry) => entry !== employeeId)
          : [...current, employeeId],
      );
    },
    [routingMode],
  );

  const handleSave = useCallback(async () => {
    if (!selectedNumber) return;

    if (routingMode === 'NUMBER_OWNER' && selectedEmployeeIds.length !== 1) {
      setFeedback({
        type: 'error',
        text: t('whatsappInbox.errors.directModeRequiresOneEmployee'),
      });
      return;
    }

    if (routingMode === 'ROUND_ROBIN' && selectedEmployeeIds.length < 2) {
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
          userIds: selectedEmployeeIds,
        },
      );

      setPreviewResult(null);
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
  }, [selectedNumber, routingMode, selectedEmployeeIds, t, loadWorkspace]);

  const handleUnassign = useCallback(async () => {
    if (!selectedNumber) return;

    setSaving(true);
    setFeedback(null);

    try {
      await apiClient.post('/api/v1/admin/whatsapp-numbers/unassign', {
        sessionId: selectedNumber.sessionId,
      });

      setPreviewResult(null);
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
  }, [selectedNumber, t, loadWorkspace]);

  const handleSaveSettings = useCallback(
    async (nextSettings: InboxSettings) => {
      setSettingsSaving(true);
      setFeedback(null);

      try {
      const response = await apiClient.put<{
        success?: boolean;
        settings?: Partial<InboxSettings>;
      }>('/api/v1/inbox-settings', nextSettings);
      if (response.data?.success) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data.settings });
        setFeedback({
          type: 'success',
          text: t('whatsappInbox.settingsSaved'),
        });
      }
    } catch (error: unknown) {
      const errorText =
        (error as { response?: { data?: { error?: string } } })?.response
          ?.data?.error || (t('whatsappInbox.errorOccurred') as string);
      setFeedback({ type: 'error', text: errorText });
      } finally {
        setSettingsSaving(false);
      }
    },
    [t],
  );

  const clearFeedback = useCallback(() => setFeedback(null), []);

  return {
    numbers,
    employees,
    stats,
    settings,
    selectedSessionId,
    selectedNumber,
    routingMode,
    selectedEmployeeIds,
    employeeLookup,
    loading,
    saving,
    settingsSaving,
    feedback,
    previewResult,
    dirty,
    loadWorkspace,
    loadSettings,
    handleSessionSelect,
    handleModeChange,
    toggleEmployee,
    handleSelectAll,
    handleSave,
    handleUnassign,
    handleSaveSettings,
    clearFeedback,
    setPreviewResult,
  };
};