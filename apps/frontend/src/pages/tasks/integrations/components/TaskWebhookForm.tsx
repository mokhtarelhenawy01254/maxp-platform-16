import React from 'react';
import type {
  TaskWebhook,
  WebhookFormState,
  WebhookSecretMode,
} from '../types/taskIntegrationTypes';
import {
  WEBHOOK_PROVIDER_OPTIONS,
  TASK_WEBHOOK_EVENTS,
} from '../utils/taskIntegrationConstants';
import { TaskWebhookOpenClawFields } from './TaskWebhookOpenClawFields';

interface TaskWebhookFormProps {
  editingWebhook: TaskWebhook | null;
  webhookForm: WebhookFormState;
  submittingWebhook: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<WebhookFormState>>;
  onToggleEvent: (eventValue: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TaskWebhookForm: React.FC<TaskWebhookFormProps> = ({
  editingWebhook,
  webhookForm,
  submittingWebhook,
  onFormChange,
  onToggleEvent,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="mt-5 rounded-[24px] border border-secondary/20 bg-secondary/8 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold text-foreground">
          {editingWebhook ? 'تعديل الـ webhook' : 'إنشاء Webhook جديدة'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          إلغاء
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-2 text-sm font-medium text-foreground">
            نوع التكامل
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {WEBHOOK_PROVIDER_OPTIONS.map((providerOption) => (
              <button
                key={providerOption.value}
                type="button"
                onClick={() =>
                  onFormChange((current) => ({
                    ...current,
                    providerType: providerOption.value,
                  }))
                }
                className={`rounded-2xl border p-4 text-right transition ${
                  webhookForm.providerType === providerOption.value
                    ? 'border-secondary/25 bg-secondary/10 text-foreground shadow-[0_20px_60px_-48px_rgba(34,199,201,0.42)]'
                    : 'border-border/70 bg-background/72 text-foreground hover:bg-background'
                }`}
              >
                <div className="text-sm font-semibold">
                  {providerOption.label}
                </div>
                <div className="mt-1 text-xs leading-6 opacity-80">
                  {providerOption.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            اسم الـ webhook
          </label>
          <input
            value={webhookForm.name}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
            placeholder="مثال: مزامنة متجر خارجي"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            الرابط المستهدف
          </label>
          <input
            value={webhookForm.targetUrl}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                targetUrl: event.target.value,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
            placeholder="https://partner.example.com/webhooks/tasks"
          />
        </div>

        {webhookForm.providerType === 'OPENCLAW' && (
          <TaskWebhookOpenClawFields
            providerConfig={webhookForm.providerConfig}
            onChange={onFormChange}
          />
        )}

        <div className="md:col-span-2">
          <div className="mb-2 text-sm font-medium text-foreground">
            الأحداث المرسلة
          </div>
          <div className="flex flex-wrap gap-2">
            {TASK_WEBHOOK_EVENTS.map((eventItem) => (
              <button
                key={eventItem.value}
                type="button"
                onClick={() => onToggleEvent(eventItem.value)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  webhookForm.subscribedEvents.includes(eventItem.value)
                    ? 'border-secondary/25 bg-secondary text-secondary-foreground'
                    : 'border-border/60 bg-background/75 text-foreground hover:bg-background'
                }`}
              >
                {eventItem.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            وضع التوقيع
          </label>
          <select
            value={webhookForm.secretMode}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                secretMode: event.target.value as WebhookSecretMode,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
          >
            {!editingWebhook && (
              <option value="auto">توليد secret تلقائيًا</option>
            )}
            {editingWebhook && (
              <option value="keep">الاحتفاظ بالـ secret الحالية</option>
            )}
            {editingWebhook && (
              <option value="rotate">تدوير الـ secret الحالية</option>
            )}
            <option value="custom">secret مخصصة</option>
            <option value="none">بدون توقيع</option>
          </select>
        </div>

        <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={webhookForm.isActive}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
          />
          تفعيل الـ webhook بعد الحفظ
        </label>

        {webhookForm.secretMode === 'custom' && (
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              signing secret
            </label>
            <input
              value={webhookForm.signingSecret}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  signingSecret: event.target.value,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none font-mono"
              placeholder="أدخل قيمة سرية مخصصة"
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">
            customHeaders بصيغة JSON
          </label>
          <textarea
            value={webhookForm.customHeaders}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                customHeaders: event.target.value,
              }))
            }
            rows={5}
            className="business-control-input w-full rounded-2xl px-3 py-2 font-mono text-sm text-foreground focus:border-secondary focus:outline-none"
            placeholder={'{\n  "X-Partner-Id": "store-17"\n}'}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submittingWebhook}
          className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submittingWebhook
            ? 'جارٍ الحفظ...'
            : editingWebhook
              ? 'حفظ التعديلات'
              : 'إنشاء الـ webhook'}
        </button>
      </div>
    </div>
  );
};
