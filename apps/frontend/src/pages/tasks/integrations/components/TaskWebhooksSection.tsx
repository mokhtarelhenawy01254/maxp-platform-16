import React from 'react';
import {
  LinkIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import type {
  DeliveryFilter,
  OpenClawProfile,
  OpenClawQuickSetupState,
  Pagination,
  TaskWebhook,
  WebhookDelivery,
  WebhookFormState,
} from '../types/taskIntegrationTypes';
import { formatDateTime } from '../utils/taskIntegrationConstants';
import { TaskOpenClawSection } from './TaskOpenClawSection';
import { TaskWebhookForm } from './TaskWebhookForm';
import { TaskWebhookDeliveriesList } from './TaskWebhookDeliveriesList';

interface TaskWebhooksSectionProps {
  webhooks: TaskWebhook[];
  loading: boolean;
  showWebhookForm: boolean;
  editingWebhook: TaskWebhook | null;
  webhookForm: WebhookFormState;
  submittingWebhook: boolean;
  testingWebhookId: string | null;
  openClawProfiles: OpenClawProfile[];
  currentOpenClawProfile: OpenClawProfile | null;
  openClawQuickSetup: OpenClawQuickSetupState;
  savingOpenClawProfile: boolean;
  hydratingOpenClawProfileId: string | null;
  deletingOpenClawProfileId: string | null;
  expandedWebhookId: string | null;
  deliveriesByWebhook: Record<string, WebhookDelivery[]>;
  deliveryFilterByWebhook: Record<string, DeliveryFilter>;
  deliveryPaginationByWebhook: Record<string, Pagination>;
  loadingDeliveriesFor: string | null;
  retryingDeliveryId: string | null;
  onApplyOpenClawLocalPreset: () => void;
  onApplyOpenClawProductionPreset: () => void;
  onQuickSetupChange: React.Dispatch<React.SetStateAction<OpenClawQuickSetupState>>;
  onApplyOpenClawQuickSetup: () => void;
  onSaveOpenClawProfile: () => void;
  onDeleteOpenClawProfile: (profile: OpenClawProfile) => void;
  onHydrateOpenClawProfile: (profile: OpenClawProfile) => void;
  onCreateOpenClawWebhook: (testAfterSave: boolean) => void;
  onWebhookFormChange: React.Dispatch<React.SetStateAction<WebhookFormState>>;
  onToggleWebhookEvent: (eventValue: string) => void;
  onSubmitWebhook: () => void;
  onCancelWebhookForm: () => void;
  onStartEditingWebhook: (webhook: TaskWebhook) => void;
  onTestWebhookConnection: (webhook: TaskWebhook) => void;
  onRotateWebhookSecret: (webhook: TaskWebhook) => void;
  onToggleWebhookActiveState: (webhook: TaskWebhook) => void;
  onDeleteWebhook: (webhook: TaskWebhook) => void;
  onToggleDeliveries: (webhookId: string) => void;
  onDeliveryFilterChange: (webhookId: string, filter: DeliveryFilter) => void;
  onRetryDelivery: (webhookId: string, delivery: WebhookDelivery) => void;
  onCopySecret: (value: string, message: string) => void;
}

export const TaskWebhooksSection: React.FC<TaskWebhooksSectionProps> = ({
  webhooks,
  loading,
  showWebhookForm,
  editingWebhook,
  webhookForm,
  submittingWebhook,
  testingWebhookId,
  openClawProfiles,
  currentOpenClawProfile,
  openClawQuickSetup,
  savingOpenClawProfile,
  hydratingOpenClawProfileId,
  deletingOpenClawProfileId,
  expandedWebhookId,
  deliveriesByWebhook,
  deliveryFilterByWebhook,
  deliveryPaginationByWebhook,
  loadingDeliveriesFor,
  retryingDeliveryId,
  onApplyOpenClawLocalPreset,
  onApplyOpenClawProductionPreset,
  onQuickSetupChange,
  onApplyOpenClawQuickSetup,
  onSaveOpenClawProfile,
  onDeleteOpenClawProfile,
  onHydrateOpenClawProfile,
  onCreateOpenClawWebhook,
  onWebhookFormChange,
  onToggleWebhookEvent,
  onSubmitWebhook,
  onCancelWebhookForm,
  onStartEditingWebhook,
  onTestWebhookConnection,
  onRotateWebhookSecret,
  onToggleWebhookActiveState,
  onDeleteWebhook,
  onToggleDeliveries,
  onDeliveryFilterChange,
  onRetryDelivery,
  onCopySecret,
}) => {
  return (
    <section className="rounded-[28px] border border-border/70 bg-card/72 p-5 shadow-[0_22px_70px_-54px_rgba(15,27,45,0.28)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Webhooks
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums font-mono">{webhooks.length}</span> endpoint مرتبطة بتحديثات المهام
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <button
            type="button"
            onClick={onApplyOpenClawLocalPreset}
            className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
          >
            <LinkIcon className="ml-2 h-4 w-4" />
            OpenClaw محلي
          </button>
          <button
            type="button"
            onClick={onApplyOpenClawProductionPreset}
            className="inline-flex items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/8 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12"
          >
            <ShieldCheckIcon className="ml-2 h-4 w-4" />
            OpenClaw إنتاج
          </button>
        </div>
      </div>

      <TaskOpenClawSection
        openClawProfiles={openClawProfiles}
        currentOpenClawProfile={currentOpenClawProfile}
        openClawQuickSetup={openClawQuickSetup}
        savingOpenClawProfile={savingOpenClawProfile}
        hydratingOpenClawProfileId={hydratingOpenClawProfileId}
        deletingOpenClawProfileId={deletingOpenClawProfileId}
        submittingWebhook={submittingWebhook}
        onQuickSetupChange={onQuickSetupChange}
        onApplyQuickSetup={onApplyOpenClawQuickSetup}
        onSaveProfile={onSaveOpenClawProfile}
        onDeleteProfile={onDeleteOpenClawProfile}
        onHydrateProfile={onHydrateOpenClawProfile}
        onCreateWebhook={onCreateOpenClawWebhook}
      />

      {showWebhookForm && (
        <TaskWebhookForm
          editingWebhook={editingWebhook}
          webhookForm={webhookForm}
          submittingWebhook={submittingWebhook}
          onFormChange={onWebhookFormChange}
          onToggleEvent={onToggleWebhookEvent}
          onSubmit={onSubmitWebhook}
          onCancel={onCancelWebhookForm}
        />
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
            جارٍ تحميل الـ webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
            لا توجد Webhooks حتى الآن.
          </div>
        ) : (
          webhooks.map((webhook) => {
            const deliveries = deliveriesByWebhook[webhook.id] || [];
            const deliveryPagination = deliveryPaginationByWebhook[webhook.id];
            const isExpanded = expandedWebhookId === webhook.id;
            const deliveryFilter = deliveryFilterByWebhook[webhook.id] || 'all';

            return (
              <div
                key={webhook.id}
                className="rounded-[24px] border border-border/70 bg-background/70 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {webhook.name}
                      </h4>
                      <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                        {webhook.providerType === 'OPENCLAW'
                          ? 'OpenClaw'
                          : 'Generic'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          webhook.isActive
                            ? 'border border-primary/20 bg-primary/8 text-primary'
                            : 'border border-border/60 bg-background/75 text-muted-foreground'
                        }`}
                      >
                        {webhook.isActive ? 'نشط' : 'معطل'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          webhook.hasSigningSecret
                            ? 'border border-secondary/20 bg-secondary/10 text-secondary'
                            : 'border border-border/60 bg-background/75 text-muted-foreground'
                        }`}
                      >
                        {webhook.hasSigningSecret ? 'موقّع' : 'بدون توقيع'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
                      <a
                        href={webhook.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-secondary hover:underline font-mono text-xs"
                      >
                        {webhook.targetUrl}
                      </a>
                    </div>
                    {webhook.providerType === 'OPENCLAW' && (
                      <div className="mt-2 text-xs leading-6 text-muted-foreground font-mono">
                        agent: {webhook.providerConfig.agentId || 'default'}{' '}
                        | session:{' '}
                        {webhook.providerConfig.sessionMode === 'task-scoped'
                          ? `${webhook.providerConfig.sessionKeyPrefix}...`
                          : 'defaultSessionKey'}
                        {' | '}wake: {webhook.providerConfig.wakeMode}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onStartEditingWebhook(webhook)}
                      className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                    >
                      تحرير
                    </button>
                    <button
                      type="button"
                      onClick={() => onTestWebhookConnection(webhook)}
                      disabled={testingWebhookId === webhook.id}
                      className="rounded-2xl border border-secondary/20 bg-secondary/8 px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {testingWebhookId === webhook.id
                        ? 'جارٍ الاختبار...'
                        : 'اختبار الاتصال'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotateWebhookSecret(webhook)}
                      className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
                    >
                      تدوير secret
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleWebhookActiveState(webhook)}
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                        webhook.isActive
                          ? 'border border-border/60 bg-background/75 text-foreground hover:bg-background'
                          : 'border border-primary/20 bg-primary/8 text-primary hover:bg-primary/12'
                      }`}
                    >
                      {webhook.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteWebhook(webhook)}
                      className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/12 dark:text-rose-300"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                    <div className="text-xs text-muted-foreground">
                      آخر Trigger
                    </div>
                    <div className="mt-1 font-mono tabular-nums text-foreground">
                      {formatDateTime(webhook.lastTriggeredAt)}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                    <div className="text-xs text-muted-foreground">
                      آخر نجاح
                    </div>
                    <div className="mt-1 font-mono tabular-nums text-foreground">
                      {formatDateTime(webhook.lastSuccessAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {webhook.subscribedEvents.map((eventName) => (
                    <span
                      key={eventName}
                      className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs font-semibold text-foreground font-mono"
                    >
                      {eventName}
                    </span>
                  ))}
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 font-mono tabular-nums">
                    failures: {webhook.failureCount}
                  </span>
                </div>

                <div className="mt-4 border-t border-border/70 pt-4">
                  <button
                    type="button"
                    onClick={() => onToggleDeliveries(webhook.id)}
                    className="inline-flex items-center text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    )}
                    سجل التسليم
                    {deliveryPagination && (
                      <span className="mr-2 text-xs text-muted-foreground font-mono tabular-nums">
                        ({deliveryPagination.total})
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <TaskWebhookDeliveriesList
                      webhookId={webhook.id}
                      deliveries={deliveries}
                      loading={loadingDeliveriesFor === webhook.id}
                      filter={deliveryFilter}
                      retryingDeliveryId={retryingDeliveryId}
                      onFilterChange={(filter) =>
                        onDeliveryFilterChange(webhook.id, filter)
                      }
                      onRetryDelivery={(delivery) =>
                        onRetryDelivery(webhook.id, delivery)
                      }
                      onCopySecret={onCopySecret}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
