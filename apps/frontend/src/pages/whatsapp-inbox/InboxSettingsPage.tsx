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
  <div className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
    <div>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>

    <button
      type="button"
      onClick={onChange}
      className={`relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked
            ? isRtl
              ? 'right-1'
              : 'left-6'
            : isRtl
              ? 'right-6'
              : 'left-1'
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
      [key]: !Boolean(current[key]),
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
          <div className="h-64 animate-pulse rounded-[30px] bg-slate-200/70 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-[30px] bg-slate-200/70 dark:bg-slate-800" />
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

        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_45%,#fef2f2_100%)] p-6 shadow-[0_30px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#07111a_0%,#0f172a_50%,#20151f_100%)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex w-fit rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm dark:border-sky-900/60 dark:bg-slate-900/70 dark:text-sky-300">
                {t('whatsappInbox.settingsBadge')}
              </span>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {t('whatsappInbox.settingsTitle')}
              </h1>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                {t('whatsappInbox.settingsDescription')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/whatsapp-inbox')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {t('whatsappInbox.backToWorkspace')}
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? t('whatsappInbox.settingsSaving')
                  : t('whatsappInbox.settingsSave')}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('whatsappInbox.settingsOperationsTitle')}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {t('whatsappInbox.settingsOperationsDescription')}
                </p>
              </div>

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
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
                      {t('whatsappInbox.settingsAutoCloseAfter')}
                    </label>
                    <div className="flex items-center gap-3">
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
                        className="w-28 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {t('whatsappInbox.settingsMinutes')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
                      {t('whatsappInbox.settingsDefaultStatus')}
                    </label>
                    <select
                      value={settings.defaultChatStatus}
                      onChange={(event) =>
                        updateField('defaultChatStatus', event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="NEW">{t('whatsappInbox.statusNew')}</option>
                      <option value="ACTIVE">{t('whatsappInbox.statusActive')}</option>
                      <option value="PENDING">{t('whatsappInbox.statusPending')}</option>
                    </select>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
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
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('whatsappInbox.settingsNotificationsTitle')}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {t('whatsappInbox.settingsNotificationsDescription')}
                </p>
              </div>

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

          <div className="space-y-6">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('whatsappInbox.settingsPolicyTitle')}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {t('whatsappInbox.settingsPolicyDescription')}
                </p>
              </div>

              <div className="space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  {t('whatsappInbox.settingsPrivacyRuleDirect')}
                </div>
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                  {t('whatsappInbox.settingsPrivacyRuleRoundRobin')}
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                  {t('whatsappInbox.settingsPolicyFooter')}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('whatsappInbox.settingsWorkingHoursTitle')}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  {t('whatsappInbox.settingsWorkingHoursDescription')}
                </p>
              </div>

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
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                        <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
                          {t('whatsappInbox.settingsWorkingHoursStart')}
                        </label>
                        <input
                          type="time"
                          value={settings.workingHoursStart}
                          onChange={(event) =>
                            updateField('workingHoursStart', event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                        <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
                          {t('whatsappInbox.settingsWorkingHoursEnd')}
                        </label>
                        <input
                          type="time"
                          value={settings.workingHoursEnd}
                          onChange={(event) =>
                            updateField('workingHoursEnd', event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
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
                              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                isActive
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
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
