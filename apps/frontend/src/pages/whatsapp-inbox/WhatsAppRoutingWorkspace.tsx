import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Settings as SettingsIcon, PhoneCall, Loader2, CheckCircle2, AlertCircle, X, Save, Trash2, ChevronLeft } from 'lucide-react';
import { useRoutingWorkspace } from './hooks/useRoutingWorkspace';
import NumberSidebar from './components/NumberSidebar';
import WorkspaceStats from './components/WorkspaceStats';
import RoutingModeSelector from './components/RoutingModeSelector';
import EmployeePicker from './components/EmployeePicker';
import EmployeeSummary from './components/EmployeeSummary';
import SettingsPanel from './components/SettingsPanel';
import UnassignDialog from './components/UnassignDialog';

const CONNECTION_META: Record<string, { label: string; dot: string }> = {
  CONNECTED: { label: 'statusConnected', dot: 'bg-success' },
  DISCONNECTED: { label: 'statusDisconnected', dot: 'bg-destructive' },
  CONNECTING: { label: 'statusConnecting', dot: 'bg-warning' },
  ERROR: { label: 'statusError', dot: 'bg-destructive' },
};

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
        <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
          <div className="h-6 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-4 flex gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 flex-1 animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px,1fr]">
            <div className="h-[400px] animate-pulse rounded bg-muted" />
            <div className="h-[400px] animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/50 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">
            {t('whatsappInbox.workspaceTitle')}
          </h1>
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t('whatsappInbox.unsavedChanges')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <SettingsIcon className="size-3.5" />
            <span className="hidden sm:inline">{t('whatsappInbox.openSettings')}</span>
          </button>
          <button
            onClick={() => void loadWorkspace(selectedSessionId)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">{t('whatsappInbox.refreshWorkspace')}</span>
          </button>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2 text-sm md:px-6 ${
          feedback.type === 'success'
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={clearFeedback} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Stats strip */}
      <div className="shrink-0 border-b border-border/50 px-4 py-2.5 md:px-6">
        <WorkspaceStats stats={stats} onStatClick={handleStatClick} />
      </div>

      {/* Main 2-column area */}
      <div className="routing-workspace-grid grid min-h-0 flex-1">
        {/* Left: Number sidebar (sticky) */}
        <div className="min-h-0 overflow-hidden border-r border-border/50">
          <NumberSidebar
            numbers={numbers}
            selectedSessionId={selectedSessionId}
            onSelect={handleSessionSelect}
            statusFilter={sidebarFilter}
            onStatusFilterChange={setSidebarFilter}
          />
        </div>

        {/* Right: Configuration panel */}
        <div className="flex min-h-0 flex-col">
          {!selectedNumber ? (
            <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-full bg-muted p-5 text-muted-foreground">
                <PhoneCall className="size-7" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {t('whatsappInbox.workspaceEmptyTitle')}
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                {t('whatsappInbox.workspaceEmptyDescription')}
              </p>
            </div>
          ) : (
            <>
              {/* Number context header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/50 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CONNECTION_META[selectedNumber.connectionStatus]?.dot || 'bg-muted'}`} />
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {selectedNumber.session.name ||
                      selectedNumber.session.profileName ||
                      selectedNumber.session.phoneNumber}
                  </h2>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline" dir="ltr">
                    {selectedNumber.session.phoneNumber}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t(`whatsappInbox.${CONNECTION_META[selectedNumber.connectionStatus]?.label || 'statusError'}`)}
                </span>
              </div>

              {/* Scrollable config area */}
              <div className="wa-slim-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
                {/* Step 1: Routing Mode */}
                <section>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t('whatsappInbox.modeDirect').split(' ')[0] === 'ربط'
                        ? 'طريقة التوزيع'
                        : 'Routing mode'}
                    </h3>
                  </div>
                  <RoutingModeSelector mode={routingMode} onChange={handleModeChange} />
                </section>

                {/* Step 2: Employee Selection */}
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selectedEmployeeIds.length > 0
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {t('whatsappInbox.workspaceEmployeesTitle')}
                    </span>
                    {selectedEmployeeIds.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({selectedEmployeeIds.length})
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4">
                    <EmployeePicker
                      employees={employees}
                      selectedEmployeeIds={selectedEmployeeIds}
                      routingMode={routingMode}
                      showInactive={showInactive}
                      onToggleInactive={setShowInactive}
                      onToggleEmployee={toggleEmployee}
                      onSelectAll={handleSelectAll}
                    />
                    <div className="mt-4 border-t border-border/50 pt-4">
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
                  </div>
                </section>
              </div>

              {/* Sticky action bar */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/50 bg-card/80 px-4 py-3 backdrop-blur-md md:px-6">
                <button
                  type="button"
                  onClick={() => setUnassignOpen(true)}
                  disabled={saving || !selectedNumber.isConfigured}
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  {t('whatsappInbox.unassign')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saving ? t('whatsappInbox.savingRouting') : t('whatsappInbox.saveRouting')}
                </button>
              </div>
            </>
          )}
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