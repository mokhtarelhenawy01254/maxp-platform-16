import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { useRoutingWorkspace } from './hooks/useRoutingWorkspace';
import NumberSidebar from './components/NumberSidebar';
import WorkspaceStats from './components/WorkspaceStats';
import RoutingModeSelector from './components/RoutingModeSelector';
import EmployeePicker from './components/EmployeePicker';
import EmployeeSummary from './components/EmployeeSummary';
import SettingsPanel from './components/SettingsPanel';
import UnassignDialog from './components/UnassignDialog';

const WhatsAppRoutingWorkspace: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();

  const {
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
    handleSessionSelect,
    handleModeChange,
    toggleEmployee,
    handleSave,
    handleUnassign,
    handleSaveSettings,
    clearFeedback,
    setPreviewResult,
  } = useRoutingWorkspace();

  const [showInactive, setShowInactive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);

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

  const formatDateTime = (value?: string | null) => {
    if (!value) return t('whatsappInbox.notAvailable');
    return new Date(value).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handlePreviewResult = useCallback(
    (result: typeof previewResult) => setPreviewResult(result),
    [setPreviewResult],
  );

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
            className={`rounded-lg border px-4 py-3 text-sm shadow-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={clearFeedback}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">
              {t('whatsappInbox.workspaceTitle')}
            </h1>
            {dirty && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('whatsappInbox.unsavedChanges')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              <SettingsIcon className="size-4" />
              {t('whatsappInbox.openSettings')}
            </button>
            <button
              onClick={() => void loadWorkspace(selectedSessionId)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <RefreshCw className="size-4" />
              {t('whatsappInbox.refreshWorkspace')}
            </button>
          </div>
        </div>

        <WorkspaceStats stats={stats} />

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <NumberSidebar
            numbers={numbers}
            selectedSessionId={selectedSessionId}
            onSelect={handleSessionSelect}
          />

          <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            {!selectedNumber ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-muted p-4 text-2xl text-muted-foreground">
                  01
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">
                  {t('whatsappInbox.workspaceEmptyTitle')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('whatsappInbox.workspaceEmptyDescription')}
                </p>
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

                  {selectedNumber.lastDistributedAt && (
                    <div className="rounded-lg border border-border/50 bg-muted px-3 py-3 text-sm">
                      <p className="font-medium text-muted-foreground">
                        {t('whatsappInbox.lastDistribution')}
                      </p>
                      <p className="mt-1 text-foreground">
                        {selectedNumber.lastDistributedUserId
                          ? `${employeeLookup[selectedNumber.lastDistributedUserId]?.firstName || ''} ${employeeLookup[selectedNumber.lastDistributedUserId]?.lastName || ''}`.trim()
                          : t('whatsappInbox.notAvailable')}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(selectedNumber.lastDistributedAt)}
                      </p>
                    </div>
                  )}
                </div>

                <RoutingModeSelector mode={routingMode} onChange={handleModeChange} />

                <div className="grid gap-4 md:grid-cols-[1.4fr,0.9fr]">
                  <EmployeePicker
                    employees={employees}
                    selectedEmployeeIds={selectedEmployeeIds}
                    routingMode={routingMode}
                    showInactive={showInactive}
                    onToggleInactive={setShowInactive}
                    onToggleEmployee={toggleEmployee}
                  />

                  <EmployeeSummary
                    selectedEmployeeIds={selectedEmployeeIds}
                    employeeLookup={employeeLookup}
                    routingMode={routingMode}
                    selectedNumber={selectedNumber}
                    showInactive={showInactive}
                    previewResult={previewResult}
                    onPreviewResult={handlePreviewResult}
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setUnassignOpen(true)}
                    disabled={saving || !selectedNumber.isConfigured}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('whatsappInbox.unassign')}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
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

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        saving={settingsSaving}
        onSave={async (nextSettings) => {
          await handleSaveSettings(nextSettings);
          setSettingsOpen(false);
        }}
      />

      <UnassignDialog
        open={unassignOpen}
        number={selectedNumber}
        saving={saving}
        onConfirm={async () => {
          await handleUnassign();
          setUnassignOpen(false);
        }}
        onCancel={() => setUnassignOpen(false)}
      />
    </div>
  );
};

export default WhatsAppRoutingWorkspace;