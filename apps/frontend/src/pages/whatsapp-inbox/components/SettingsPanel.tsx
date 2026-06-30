import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { InboxSettings } from '../types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: InboxSettings;
  saving: boolean;
  onSave: (settings: InboxSettings) => void;
}

const WEEKDAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

const ToggleField: React.FC<{
  checked: boolean;
  onChange: () => void;
  title: string;
  isRtl: boolean;
}> = ({ checked, onChange, title, isRtl }) => (
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  settings,
  saving,
  onSave,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const [localSettings, setLocalSettings] = React.useState<InboxSettings>(settings);

  React.useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

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

  const updateField = <K extends keyof InboxSettings>(key: K, value: InboxSettings[K]) => {
    setLocalSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleField = (key: keyof InboxSettings) => {
    setLocalSettings((current) => ({ ...current, [key]: !current[key] }) as InboxSettings);
  };

  const toggleDay = (day: string) => {
    const selectedDays = localSettings.workingDays
      ? localSettings.workingDays.split(',').filter(Boolean)
      : [];
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((entry) => entry !== day)
      : [...selectedDays, day];
    updateField('workingDays', nextDays.join(','));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-xl animate-slide-in-right"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('whatsappInbox.settingsTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              {t('whatsappInbox.settingsOperationsTitle')}
            </h3>

            <div className="mt-3 space-y-3">
              <ToggleField
                checked={localSettings.allowTransfer}
                onChange={() => toggleField('allowTransfer')}
                title={t('whatsappInbox.settingsAllowTransfer')}
                isRtl={isRtl}
              />
              <ToggleField
                checked={localSettings.requireNoteOnClose}
                onChange={() => toggleField('requireNoteOnClose')}
                title={t('whatsappInbox.settingsRequireCloseNote')}
                isRtl={isRtl}
              />
              <ToggleField
                checked={localSettings.autoCloseEnabled}
                onChange={() => toggleField('autoCloseEnabled')}
                title={t('whatsappInbox.settingsAutoClose')}
                isRtl={isRtl}
              />

              {localSettings.autoCloseEnabled && (
                <div className="rounded-lg border border-border/50 bg-muted p-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t('whatsappInbox.settingsAutoCloseAfter')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={localSettings.autoCloseAfterMin}
                      onChange={(event) =>
                        updateField('autoCloseAfterMin', Math.max(1, Number(event.target.value) || 1))
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
                    value={localSettings.defaultChatStatus}
                    onChange={(event) => updateField('defaultChatStatus', event.target.value)}
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
                    value={localSettings.maxChatsPerModerator}
                    onChange={(event) =>
                      updateField('maxChatsPerModerator', Math.max(1, Number(event.target.value) || 1))
                    }
                    className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              {t('whatsappInbox.settingsNotificationsTitle')}
            </h3>

            <div className="mt-3 space-y-3">
              <ToggleField
                checked={localSettings.notifyOnNewChat}
                onChange={() => toggleField('notifyOnNewChat')}
                title={t('whatsappInbox.settingsNotifyNewChat')}
                isRtl={isRtl}
              />
              <ToggleField
                checked={localSettings.notifyOnTransfer}
                onChange={() => toggleField('notifyOnTransfer')}
                title={t('whatsappInbox.settingsNotifyTransfer')}
                isRtl={isRtl}
              />
              <ToggleField
                checked={localSettings.browserPushEnabled}
                onChange={() => toggleField('browserPushEnabled')}
                title={t('whatsappInbox.settingsBrowserPush')}
                isRtl={isRtl}
              />
              <ToggleField
                checked={localSettings.soundEnabled}
                onChange={() => toggleField('soundEnabled')}
                title={t('whatsappInbox.settingsSoundEnabled')}
                isRtl={isRtl}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              {t('whatsappInbox.settingsPolicyTitle')}
            </h3>

            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 dark:border-success/40 dark:bg-success/20">
                {t('whatsappInbox.settingsPrivacyRuleDirect')}
              </div>
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 dark:border-secondary/40 dark:bg-secondary/20">
                {t('whatsappInbox.settingsPrivacyRuleRoundRobin')}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              {t('whatsappInbox.settingsWorkingHoursTitle')}
            </h3>

            <div className="mt-3 space-y-4">
              <ToggleField
                checked={localSettings.workingHoursEnabled}
                onChange={() => toggleField('workingHoursEnabled')}
                title={t('whatsappInbox.settingsWorkingHoursToggle')}
                isRtl={isRtl}
              />

              {localSettings.workingHoursEnabled && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/50 bg-muted p-4">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        {t('whatsappInbox.settingsWorkingHoursStart')}
                      </label>
                      <input
                        type="time"
                        value={localSettings.workingHoursStart}
                        onChange={(event) => updateField('workingHoursStart', event.target.value)}
                        className="w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                      />
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted p-4">
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        {t('whatsappInbox.settingsWorkingHoursEnd')}
                      </label>
                      <input
                        type="time"
                        value={localSettings.workingHoursEnd}
                        onChange={(event) => updateField('workingHoursEnd', event.target.value)}
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
                        const isActive = localSettings.workingDays
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

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/50 bg-card px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('whatsappInbox.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? t('whatsappInbox.settingsSaving')
              : t('whatsappInbox.settingsSave')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;