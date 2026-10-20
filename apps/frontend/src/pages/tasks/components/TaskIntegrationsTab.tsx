import React, { useMemo } from 'react';
import {
  KeyIcon,
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuthSimple';
import { buildApiUrl, buildAppUrl } from '@/utils/urlHelper';
import type { CompanyUser } from '../integrations/types/taskIntegrationTypes';
import {
  MANAGEMENT_ROLES,
  buildUserLabel,
  buildTaskSnippets,
} from '../integrations/utils/taskIntegrationConstants';
import { useTaskIntegrationsData } from '../integrations/hooks/useTaskIntegrationsData';
import { TaskIntegrationQuickLinksCard } from '../integrations/components/TaskIntegrationQuickLinksCard';
import { TaskSecretRevealModal } from '../integrations/components/TaskSecretRevealModal';
import { TaskCredentialsSection } from '../integrations/components/TaskCredentialsSection';
import { TaskWebhooksSection } from '../integrations/components/TaskWebhooksSection';

export interface TaskIntegrationsTabProps {
  users?: CompanyUser[];
}

export const TaskIntegrationsTab: React.FC<TaskIntegrationsTabProps> = ({
  users = [],
}) => {
  const { user } = useAuth();
  const activeCompanyId = user?.companyId ?? null;
  const defaultUserId = user?.id || '';
  const canManageIntegrations = MANAGEMENT_ROLES.includes(user?.role || '');

  const userOptions = useMemo(
    () =>
      users.map((companyUser) => ({
        id: companyUser.id,
        label: buildUserLabel(companyUser),
      })),
    [users],
  );

  const integrationPageUrl = useMemo(
    () =>
      new URL(
        buildAppUrl('tasks/integrations'),
        window.location.origin,
      ).toString(),
    [],
  );

  const externalApiBaseUrl = useMemo(
    () =>
      new URL(buildApiUrl('external/tasks'), window.location.origin).toString(),
    [],
  );

  const sampleAssignedUserId = useMemo(
    () => userOptions[0]?.id || 'USER_ID',
    [userOptions],
  );

  const {
    listTasksSnippet,
    createTaskSnippet,
    updateTaskSnippet,
    updateStatusSnippet,
  } = useMemo(
    () => buildTaskSnippets(externalApiBaseUrl, sampleAssignedUserId),
    [externalApiBaseUrl, sampleAssignedUserId],
  );

  const {
    credentials,
    openClawProfiles,
    webhooks,
    loading,
    loadError,
    loadingDeliveriesFor,
    expandedWebhookId,
    deliveriesByWebhook,
    deliveryFilterByWebhook,
    setDeliveryFilterByWebhook,
    deliveryPaginationByWebhook,
    credentialForm,
    setCredentialForm,
    webhookForm,
    setWebhookForm,
    openClawQuickSetup,
    setOpenClawQuickSetup,
    editingCredential,
    editingWebhook,
    showCredentialForm,
    setShowCredentialForm,
    showWebhookForm,
    setShowWebhookForm,
    submittingCredential,
    submittingWebhook,
    testingWebhookId,
    retryingDeliveryId,
    savingOpenClawProfile,
    hydratingOpenClawProfileId,
    deletingOpenClawProfileId,
    revealedSecret,
    setRevealedSecret,
    currentOpenClawProfile,
    loadIntegrations,
    copySecret,
    resetCredentialForm,
    resetWebhookForm,
    toggleCredentialScope,
    submitCredential,
    startEditingCredential,
    rotateCredential,
    toggleCredentialActiveState,
    revokeCredential,
    toggleWebhookEvent,
    submitWebhook,
    startEditingWebhook,
    toggleWebhookActiveState,
    rotateWebhookSecret,
    deleteWebhook,
    toggleDeliveries,
    testWebhookConnection,
    retryWebhookDelivery,
    applyOpenClawLocalPreset,
    applyOpenClawProductionPreset,
    hydrateOpenClawProfile,
    saveOpenClawProfile,
    deleteOpenClawProfile,
    applyOpenClawQuickSetup,
    createOpenClawWebhookFromQuickSetup,
  } = useTaskIntegrationsData(
    activeCompanyId,
    defaultUserId,
    userOptions,
    canManageIntegrations,
  );

  if (!canManageIntegrations) {
    return (
      <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/8 p-6 text-amber-900 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold">
              الوصول إلى تكاملات المهام محدود
            </h3>
            <p className="mt-2 text-sm leading-6">
              إدارة مفاتيح الـ API والـ webhooks متاحة فقط لأدوار{' '}
              <span className="font-semibold">OWNER</span>
              {'، '}
              <span className="font-semibold">COMPANY_ADMIN</span> و{' '}
              <span className="font-semibold">SUPER_ADMIN</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <section className="flex flex-col gap-2.5 rounded-[24px] border border-border/70 bg-card/62 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)] md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="tabular-nums font-mono">{credentials.length}</span> مفتاح
          </span>
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="tabular-nums font-mono">{webhooks.length}</span> webhook
          </span>
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="tabular-nums font-mono">{openClawProfiles.length}</span> إعداد OpenClaw
          </span>
        </div>

        <div className="hidden flex-wrap gap-2 md:flex">
          <button
            type="button"
            onClick={() => {
              resetCredentialForm();
              setShowCredentialForm(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
          >
            <KeyIcon className="ml-2 h-4 w-4" />
            مفتاح جديد
          </button>
          <button
            type="button"
            onClick={() => {
              resetWebhookForm();
              setShowWebhookForm(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            <PlusIcon className="ml-2 h-4 w-4" />
            Webhook جديدة
          </button>
        </div>
      </section>

      <TaskIntegrationQuickLinksCard
        externalApiBaseUrl={externalApiBaseUrl}
        integrationPageUrl={integrationPageUrl}
        listTasksSnippet={listTasksSnippet}
        createTaskSnippet={createTaskSnippet}
        updateTaskSnippet={updateTaskSnippet}
        updateStatusSnippet={updateStatusSnippet}
        onCopySecret={copySecret}
      />

      {revealedSecret && (
        <TaskSecretRevealModal
          revealedSecret={revealedSecret}
          onCopySecret={copySecret}
          onClose={() => setRevealedSecret(null)}
        />
      )}

      {loadError && (
        <div className="rounded-[26px] border border-rose-500/20 bg-rose-500/8 p-4 text-rose-900 dark:text-rose-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">تعذر تحميل التكاملات</div>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadIntegrations()}
              className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50"
            >
              <ArrowPathIcon className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskCredentialsSection
          credentials={credentials}
          loading={loading}
          showCredentialForm={showCredentialForm}
          editingCredential={editingCredential}
          credentialForm={credentialForm}
          submittingCredential={submittingCredential}
          userOptions={userOptions}
          onFormChange={setCredentialForm}
          onToggleScope={toggleCredentialScope}
          onSubmitCredential={() => void submitCredential()}
          onCancelCredentialForm={() => {
            resetCredentialForm();
            setShowCredentialForm(false);
          }}
          onStartEditingCredential={startEditingCredential}
          onRotateCredential={(cred) => void rotateCredential(cred)}
          onToggleActiveState={(cred) => void toggleCredentialActiveState(cred)}
          onRevokeCredential={(cred) => void revokeCredential(cred)}
        />

        <TaskWebhooksSection
          webhooks={webhooks}
          loading={loading}
          showWebhookForm={showWebhookForm}
          editingWebhook={editingWebhook}
          webhookForm={webhookForm}
          submittingWebhook={submittingWebhook}
          testingWebhookId={testingWebhookId}
          openClawProfiles={openClawProfiles}
          currentOpenClawProfile={currentOpenClawProfile}
          openClawQuickSetup={openClawQuickSetup}
          savingOpenClawProfile={savingOpenClawProfile}
          hydratingOpenClawProfileId={hydratingOpenClawProfileId}
          deletingOpenClawProfileId={deletingOpenClawProfileId}
          expandedWebhookId={expandedWebhookId}
          deliveriesByWebhook={deliveriesByWebhook}
          deliveryFilterByWebhook={deliveryFilterByWebhook}
          deliveryPaginationByWebhook={deliveryPaginationByWebhook}
          loadingDeliveriesFor={loadingDeliveriesFor}
          retryingDeliveryId={retryingDeliveryId}
          onApplyOpenClawLocalPreset={applyOpenClawLocalPreset}
          onApplyOpenClawProductionPreset={applyOpenClawProductionPreset}
          onQuickSetupChange={setOpenClawQuickSetup}
          onApplyOpenClawQuickSetup={() => void applyOpenClawQuickSetup()}
          onSaveOpenClawProfile={() => void saveOpenClawProfile()}
          onDeleteOpenClawProfile={(prof) => void deleteOpenClawProfile(prof)}
          onHydrateOpenClawProfile={(prof) => void hydrateOpenClawProfile(prof)}
          onCreateOpenClawWebhook={(testAfterSave) =>
            void createOpenClawWebhookFromQuickSetup(testAfterSave)
          }
          onWebhookFormChange={setWebhookForm}
          onToggleWebhookEvent={toggleWebhookEvent}
          onSubmitWebhook={() => void submitWebhook()}
          onCancelWebhookForm={() => {
            resetWebhookForm();
            setShowWebhookForm(false);
          }}
          onStartEditingWebhook={startEditingWebhook}
          onTestWebhookConnection={(wh) => void testWebhookConnection(wh)}
          onRotateWebhookSecret={(wh) => void rotateWebhookSecret(wh)}
          onToggleWebhookActiveState={(wh) => void toggleWebhookActiveState(wh)}
          onDeleteWebhook={(wh) => void deleteWebhook(wh)}
          onToggleDeliveries={(whId) => void toggleDeliveries(whId)}
          onDeliveryFilterChange={(whId, filter) =>
            setDeliveryFilterByWebhook((current) => ({
              ...current,
              [whId]: filter,
            }))
          }
          onRetryDelivery={(whId, del) => void retryWebhookDelivery(whId, del)}
          onCopySecret={copySecret}
        />
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                وصول سريع للتكاملات
              </p>
              <p className="text-xs text-muted-foreground">
                افتح إنشاء مفتاح أو webhook دون الرجوع إلى أعلى الصفحة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCredentialForm();
                setShowCredentialForm(true);
              }}
              className="rounded-full border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
            >
              مفتاح
            </button>
            <button
              type="button"
              onClick={() => {
                resetWebhookForm();
                setShowWebhookForm(true);
              }}
              className="rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
            >
              ربط
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
