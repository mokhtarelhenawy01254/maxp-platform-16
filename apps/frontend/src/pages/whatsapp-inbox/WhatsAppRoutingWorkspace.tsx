import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Settings as SettingsIcon, PhoneCall, Wifi, WifiOff, Loader2, CheckCircle2, AlertCircle, X, Save, Trash2 } from 'lucide-react';
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
    handleSelectAll,
    handleSave,
    handleUnassign,
    handleSaveSettings,
    clearFeedback,
    setPreviewResult,
  } = useRoutingWorkspace();

  const [showInactive, setShowInactive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState<'ALL' | 'CONNECTED' | 'DISCONNECTED'>('ALL');

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
        'border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/20',
      DISCONNECTED:
        'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20',
      CONNECTING:
        'border-warning/30 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/20',
      ERROR:
        'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20',
    };
    return (
      styles[status] ||
      'border-border bg-muted text-muted-foreground'
    );
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t('whatsappInbox.notAvailable');
    return new Date(value).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleStatClick = useCallback((key: string) => {
    if (key === 'connected') {
      setSidebarFilter((current) => (current === 'CONNECTED' ? 'ALL' : 'CONNECTED'));
    }
  }, []);

  const handlePreviewResult = useCallback(
    (result: typeof previewResult) => setPreviewResult(result),
    [setPreviewResult],
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="h-[540px] animate-pulse rounded-xl bg-muted" />
            <div className="h-[540px] animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4 md:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {feedback && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-sm transition-all duration-300 ${
              feedback.type === 'success'
                ? 'border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/20'
                : 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={clearFeedback}
                className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
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
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning animate-pulse-slow">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
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

        <WorkspaceStats stats={stats} onStatClick={handleStatClick} />

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <NumberSidebar
            numbers={numbers}
            selectedSessionId={selectedSessionId}
            onSelect={handleSessionSelect}
            statusFilter={sidebarFilter}
            onStatusFilterChange={setSidebarFilter}
          />

          <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300">
            {!selectedNumber ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center transition-all duration-300">
                <div className="rounded-full bg-muted p-5 text-muted-foreground transition-all duration-300 hover:scale-105">
                  <PhoneCall className="size-8" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">
                  {t('whatsappInbox.workspaceEmptyTitle')}
                </h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {t('whatsappInbox.workspaceEmptyDescription')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground transition-colors duration-200">
                        {selectedNumber.session.name ||
                          selectedNumber.session.profileName ||
                          selectedNumber.session.phoneNumber}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${resolveConnectionClasses(selectedNumber.connectionStatus)}`}
                      >
                        {selectedNumber.connectionStatus === 'CONNECTED' ? (
                          <Wifi className="size-3" />
                        ) : selectedNumber.connectionStatus === 'CONNECTING' ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <WifiOff className="size-3" />
                        )}
                        {resolveConnectionLabel(selectedNumber.connectionStatus)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                      <PhoneCall className="size-3.5" />
                      {selectedNumber.session.phoneNumber}
                    </div>
                  </div>
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
                    onSelectAll={handleSelectAll}
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
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                    {t('whatsappInbox.unassign')}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t('whatsappInbox.savingRouting')}
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        {t('whatsappInbox.saveRouting')}
                      </>
                    )}
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