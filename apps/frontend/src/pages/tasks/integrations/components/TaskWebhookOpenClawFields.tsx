import React from 'react';
import type {
  WebhookFormState,
  OpenClawWakeMode,
  OpenClawSessionMode,
} from '../types/taskIntegrationTypes';
import {
  OPENCLAW_WAKE_MODE_OPTIONS,
  OPENCLAW_SESSION_MODE_OPTIONS,
  OPENCLAW_CHANNEL_OPTIONS,
} from '../utils/taskIntegrationConstants';

interface TaskWebhookOpenClawFieldsProps {
  providerConfig: WebhookFormState['providerConfig'];
  onChange: (updater: (prev: WebhookFormState) => WebhookFormState) => void;
}

export const TaskWebhookOpenClawFields: React.FC<
  TaskWebhookOpenClawFieldsProps
> = ({ providerConfig, onChange }) => {
  return (
    <>
      <div className="md:col-span-2 rounded-[22px] border border-secondary/20 bg-secondary/8 p-4 text-sm text-foreground">
        <div className="font-semibold">إعداد OpenClaw للشركة</div>
        <p className="mt-2 leading-6">
          سيتم إرسال الطلب إلى <code className="font-mono">/hooks/agent</code> مباشرة.
          ضع <code className="font-mono">Authorization: Bearer OPENCLAW_HOOKS_TOKEN</code> داخل{' '}
          <code className="font-mono">customHeaders</code> الخاصة بهذه البيئة.
        </p>
        {providerConfig.sessionMode === 'task-scoped' && (
          <p className="mt-2 leading-6 text-muted-foreground">
            عند استخدام جلسة لكل مهمة يجب تفعيل{' '}
            <code className="font-mono">hooks.allowRequestSessionKey=true</code> داخل
            OpenClaw مع prefix مسموح مناسب.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          اسم المصدر داخل OpenClaw
        </label>
        <input
          value={providerConfig.name}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                name: event.target.value,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
          placeholder="Tasks"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          agentId داخل OpenClaw
        </label>
        <input
          value={providerConfig.agentId}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                agentId: event.target.value,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
          placeholder="main"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          wake mode
        </label>
        <select
          value={providerConfig.wakeMode}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                wakeMode: event.target.value as OpenClawWakeMode,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
        >
          {OPENCLAW_WAKE_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          session mode
        </label>
        <select
          value={providerConfig.sessionMode}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                sessionMode: event.target.value as OpenClawSessionMode,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
        >
          {OPENCLAW_SESSION_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {
            OPENCLAW_SESSION_MODE_OPTIONS.find(
              (option) => option.value === providerConfig.sessionMode,
            )?.description
          }
        </p>
      </div>

      {providerConfig.sessionMode === 'task-scoped' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            session key prefix
          </label>
          <input
            value={providerConfig.sessionKeyPrefix}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                providerConfig: {
                  ...current.providerConfig,
                  sessionKeyPrefix: event.target.value,
                },
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
            placeholder="hook:task:"
          />
        </div>
      )}

      <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={providerConfig.deliver}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                deliver: event.target.checked,
              },
            }))
          }
          className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
        />
        أرسل رد OpenClaw إلى القناة أيضًا
      </label>

      {providerConfig.deliver && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              القناة
            </label>
            <select
              value={providerConfig.channel}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  providerConfig: {
                    ...current.providerConfig,
                    channel: event.target.value,
                  },
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
            >
              {OPENCLAW_CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              المرسل إليه داخل القناة
            </label>
            <input
              value={providerConfig.to}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  providerConfig: {
                    ...current.providerConfig,
                    to: event.target.value,
                  },
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
              placeholder="مثال: chat id أو رقم حسب القناة"
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          model override
        </label>
        <input
          value={providerConfig.model}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                model: event.target.value,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
          placeholder="اختياري: openai/gpt-5.2-mini"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          thinking level
        </label>
        <input
          value={providerConfig.thinking}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                thinking: event.target.value,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
          placeholder="اختياري: low أو medium"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-foreground">
          timeoutSeconds
        </label>
        <input
          value={providerConfig.timeoutSeconds}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              providerConfig: {
                ...current.providerConfig,
                timeoutSeconds: event.target.value,
              },
            }))
          }
          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none font-mono"
          inputMode="numeric"
          placeholder="اختياري: 120"
        />
      </div>
    </>
  );
};
