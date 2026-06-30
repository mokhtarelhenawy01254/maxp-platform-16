import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTranslation } from 'react-i18next';

interface Settings {
  defaultChatStatus: string;
  autoCloseEnabled: boolean;
  autoCloseAfterMin: number;
  archiveAfterDays: number;
  retentionDays: number;
  maxChatsPerModerator: number;
  allowTransfer: boolean;
  requireNoteOnClose: boolean;
  notifyOnNewChat: boolean;
  notifyOnTransfer: boolean;
  notifyOnClose: boolean;
  browserPushEnabled: boolean;
  soundEnabled: boolean;
  soundUrl?: string;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string;
}

const defaultSettings: Settings = {
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

const WEEKDAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

const ToggleField = ({
  checked,
  onChange,
  title,
  description,
  isRtl,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  isRtl: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
    <p className="text-sm font-medium text-foreground">{title}</p>

    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${
          checked
            ? isRtl
              ? 'right-0.5'
              : 'left-[18px]'
            : isRtl
              ? 'right-[18px]'
              : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

const InboxSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);

      try {
        const response = await apiClient.get('/api/v1/inbox-settings');
        if (response.data?.success && response.data.settings) {
          setSettings({
            ...defaultSettings,
            ...response.data.settings,
          });
        }
      } catch {
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const workingDayLabels = useMemo(
    () => ({
      SAT: t('whatsappInbox.daySat'),
      SUN: t('whatsappInbox.daySun'),
      MON: t('whatsappInbox.dayMon'),
      TUE: t('whatsappInbox.dayTue'),
      WED: t('whatsappInbox.dayWed'),
      THU: t('whatsappInbox.dayThu'),
      FRI: t('whatsappInbox.dayFri'),
    }),
    [t],
  );

  const updateField = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage(null);
  };

  const toggleField = (key: keyof Settings) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }) as Settings);
    setMessage(null);
  };

  const toggleDay = (day: string) => {
    const selectedDays = settings.workingDays
      ? settings.workingDays.split(',').filter(Boolean)
      : [];

    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((entry) => entry !== day)
      : [...selectedDays, day];

    updateField('workingDays', nextDays.join(','));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await apiClient.put('/api/v1/inbox-settings', settings);
      if (response.data?.success) {
        setSettings({
          ...defaultSettings,
          ...response.data.settings,
        });
        setMessage({
          type: 'success',
          text: t('whatsappInbox.settingsSaved'),
        });
      }
    } catch (error: unknown) {
      const errorText =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('whatsappInbox.errorOccurred');

      setMessage({
        type: 'error',
        text: errorText,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {t('whatsappInbox.settingsTitle')}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/whatsapp-inbox')}
              className="inline-flex items-center justify-center rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              {t('whatsappInbox.backToWorkspace')}
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? t('whatsappInbox.settingsSaving')
                : t('whatsappInbox.settingsSave')}
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                {t('whatsappInbox.settingsOperationsTitle')}
              </h2>

              <div className="space-y-3">
                <ToggleField
                  checked={settings.allowTransfer}
                  onChange={() => toggleField('allowTransfer')}
                  title={t('whatsappInbox.settingsAllowTransfer')}
                  description={t('whatsappInbox.settingsAllowTransferDescription')}
                  isRtl={isRtl}
                />
                <ToggleField
                  checked={settings.requireNoteOnClose}
                  onChange={() => toggleField('requireNoteOnClose')}
                  title={t('whatsappInbox.settingsRequireCloseNote')}
                  description={t('whatsappInbox.settingsRequireCloseNoteDescription')}
                  isRtl={isRtl}
                />
                <ToggleField
                  checked={settings.autoCloseEnabled}
                  onChange={() => toggleField('autoCloseEnabled')}
                  title={t('whatsappInbox.settingsAutoClose')}
                  description={t('whatsappInbox.settingsAutoCloseDescription')}
                  isRtl={isRtl}
                />

                {settings.autoCloseEnabled && (
                  <div className="rounded-lg border border-border/50 bg-muted p-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('whatsappInbox.settingsAutoCloseAfter')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={settings.autoCloseAfterMin}
                        onChange={(event) =>
                          updateField(
                            'autoCloseAfterMin',
                            Math.max(1, Number(event.target.value) || 1),
                          )
                        }
                        className="w-24 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t('whatsappInbox.settingsMinutes')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/50 bg-muted p-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('whatsappInbox.settingsDefaultStatus')}
                    </label>
                    <select
                      value={settings.defaultChatStatus}
                      onChange={(event) =>
                        updateField('defaultChatStatus', event.target.value)
                      }
                      className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                    >
                      <option value="NEW">{t('whatsappInbox.statusNew')}</option>
                      <option value="ACTIVE">{t('whatsappInbox.statusActive')}</option>
                      <option value="PENDING">{t('whatsappInbox.statusPending')}</option>
                    </select>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted p-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('whatsappInbox.settingsMaxChats')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={settings.maxChatsPerModerator}
                      onChange={(event) =>
                        updateField(
                          'maxChatsPerModerator',
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                {t('whatsappInbox.settingsNotificationsTitle')}
              </h2>

              <div className="space-y-3">
                <ToggleField
                  checked={settings.notifyOnNewChat}
                  onChange={() => toggleField('notifyOnNewChat')}
                  title={t('whatsappInbox.settingsNotifyNewChat')}
                  description={t('whatsappInbox.settingsNotifyNewChatDescription')}
                  isRtl={isRtl}
                />
                <ToggleField
                  checked={settings.notifyOnTransfer}
                  onChange={() => toggleField('notifyOnTransfer')}
                  title={t('whatsappInbox.settingsNotifyTransfer')}
                  description={t('whatsappInbox.settingsNotifyTransferDescription')}
                  isRtl={isRtl}
                />
                <ToggleField
                  checked={settings.browserPushEnabled}
                  onChange={() => toggleField('browserPushEnabled')}
                  title={t('whatsappInbox.settingsBrowserPush')}
                  description={t('whatsappInbox.settingsBrowserPushDescription')}
                  isRtl={isRtl}
                />
                <ToggleField
                  checked={settings.soundEnabled}
                  onChange={() => toggleField('soundEnabled')}
                  title={t('whatsappInbox.settingsSoundEnabled')}
                  description={t('whatsappInbox.settingsSoundEnabledDescription')}
                  isRtl={isRtl}
                />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                {t('whatsappInbox.settingsPolicyTitle')}
              </h2>

              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  {t('whatsappInbox.settingsPrivacyRuleDirect')}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                  {t('whatsappInbox.settingsPrivacyRuleRoundRobin')}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                {t('whatsappInbox.settingsWorkingHoursTitle')}
              </h2>

              <div className="space-y-4">
                <ToggleField
                  checked={settings.workingHoursEnabled}
                  onChange={() => toggleField('workingHoursEnabled')}
                  title={t('whatsappInbox.settingsWorkingHoursToggle')}
                  description={t('whatsappInbox.settingsWorkingHoursToggleDescription')}
                  isRtl={isRtl}
                />

                {settings.workingHoursEnabled && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/50 bg-muted p-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          {t('whatsappInbox.settingsWorkingHoursStart')}
                        </label>
                        <input
                          type="time"
                          value={settings.workingHoursStart}
                          onChange={(event) =>
                            updateField('workingHoursStart', event.target.value)
                          }
                          className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                        />
                      </div>

                      <div className="rounded-lg border border-border/50 bg-muted p-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          {t('whatsappInbox.settingsWorkingHoursEnd')}
                        </label>
                        <input
                          type="time"
                          value={settings.workingHoursEnd}
                          onChange={(event) =>
                            updateField('workingHoursEnd', event.target.value)
                          }
                          className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted p-4">
                      <p className="mb-3 text-sm font-medium text-foreground">
                        {t('whatsappInbox.settingsWorkingDays')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => {
                          const isActive = settings.workingDays
                            .split(',')
                            .filter(Boolean)
                            .includes(day);

                          return (
                              <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                                    isActive
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border/50 bg-card text-muted-foreground'
                                  }`}
                                >
                                  {workingDayLabels[day]}
                                </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxSettingsPage;
