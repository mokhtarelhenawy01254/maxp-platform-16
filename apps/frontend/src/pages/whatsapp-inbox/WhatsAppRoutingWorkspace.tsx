import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Settings as SettingsIcon, PhoneCall, Loader2, CheckCircle2, AlertCircle, X, Save, Trash2 } from 'lucide-react';
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
        <div className="mx-auto max-w-7xl">
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
    <div className="p-4 md:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl">
        {feedback && (
          <div className={`mb-4 flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
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

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">
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
              {t('whatsappInbox.openSettings')}
            </button>
            <button
              onClick={() => void loadWorkspace(selectedSessionId)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="size-3.5" />
              {t('whatsappInbox.refreshWorkspace')}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <WorkspaceStats stats={stats} onStatClick={handleStatClick} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px,1fr]">
          <div className="flex flex-col">
            <NumberSidebar
              numbers={numbers}
              selectedSessionId={selectedSessionId}
              onSelect={handleSessionSelect}
              statusFilter={sidebarFilter}
              onStatusFilterChange={setSidebarFilter}
            />
          </div>

          {!selectedNumber ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                <PhoneCall className="size-6" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-foreground">
                {t('whatsappInbox.workspaceEmptyTitle')}
              </h2>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {t('whatsappInbox.workspaceEmptyDescription')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-foreground">
                    {selectedNumber.session.name ||
                      selectedNumber.session.profileName ||
                      selectedNumber.session.phoneNumber}
                  </h2>
                  <span className={`h-2 w-2 rounded-full ${CONNECTION_META[selectedNumber.connectionStatus]?.dot || 'bg-muted'}`} />
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {selectedNumber.session.phoneNumber}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t(`whatsappInbox.${CONNECTION_META[selectedNumber.connectionStatus]?.label || 'statusError'}`)}
                </span>
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

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saving ? t('whatsappInbox.savingRouting') : t('whatsappInbox.saveRouting')}
                </button>
              </div>
            </div>
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
