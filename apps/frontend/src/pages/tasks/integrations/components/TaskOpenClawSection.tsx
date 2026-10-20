import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type {
  OpenClawProfile,
  OpenClawQuickSetupState,
  OpenClawWakeMode,
  OpenClawSessionMode,
} from '../types/taskIntegrationTypes';
import {
  OPENCLAW_ENVIRONMENT_OPTIONS,
  OPENCLAW_WAKE_MODE_OPTIONS,
  OPENCLAW_SESSION_MODE_OPTIONS,
  createInitialOpenClawQuickSetup,
  getDefaultOpenClawBaseUrl,
  getDefaultOpenClawName,
  toOpenClawQuickSetupState,
  normalizeOpenClawAgentUrl,
} from '../utils/taskIntegrationConstants';
import { TaskOpenClawProfilesCard } from './TaskOpenClawProfilesCard';

interface TaskOpenClawSectionProps {
  openClawProfiles: OpenClawProfile[];
  currentOpenClawProfile: OpenClawProfile | null;
  openClawQuickSetup: OpenClawQuickSetupState;
  savingOpenClawProfile: boolean;
  hydratingOpenClawProfileId: string | null;
  deletingOpenClawProfileId: string | null;
  submittingWebhook: boolean;
  onQuickSetupChange: React.Dispatch<React.SetStateAction<OpenClawQuickSetupState>>;
  onApplyQuickSetup: () => void;
  onSaveProfile: () => void;
  onDeleteProfile: (profile: OpenClawProfile) => void;
  onHydrateProfile: (profile: OpenClawProfile) => void;
  onCreateWebhook: (testAfterSave: boolean) => void;
}

export const TaskOpenClawSection: React.FC<TaskOpenClawSectionProps> = ({
  openClawProfiles,
  currentOpenClawProfile,
  openClawQuickSetup,
  savingOpenClawProfile,
  hydratingOpenClawProfileId,
  deletingOpenClawProfileId,
  submittingWebhook,
  onQuickSetupChange,
  onApplyQuickSetup,
  onSaveProfile,
  onDeleteProfile,
  onHydrateProfile,
  onCreateWebhook,
}) => {
  return (
    <details className="mt-5 rounded-[24px] border border-border/70 bg-background/55 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none flex-col gap-2.5 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">
            إعداد سريع لـ OpenClaw
          </h4>
          <p className="text-xs leading-5 text-muted-foreground">
            افتحه فقط عندما تحتاج تعبئة الإعداد أو إنشاء webhook بسرعة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
            <span className="tabular-nums font-mono">{openClawProfiles.length}</span> إعداد محفوظ
          </span>
          <span className="rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            الشركة الحالية تُستخدم تلقائيًا عند الحفظ
          </span>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </summary>

      <div className="border-t border-border/60 bg-secondary/8 p-4">
        <TaskOpenClawProfilesCard
          openClawProfiles={openClawProfiles}
          currentOpenClawProfile={currentOpenClawProfile}
          hydratingOpenClawProfileId={hydratingOpenClawProfileId}
          deletingOpenClawProfileId={deletingOpenClawProfileId}
          onHydrateProfile={onHydrateProfile}
          onQuickSetupChange={onQuickSetupChange}
          onDeleteProfile={onDeleteProfile}
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <div className="mb-2 text-sm font-medium text-foreground">
              البيئة
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {OPENCLAW_ENVIRONMENT_OPTIONS.map((environmentOption) => (
                <button
                  key={environmentOption.value}
                  type="button"
                  onClick={() => {
                    const matchingProfile = openClawProfiles.find(
                      (profile) =>
                        profile.environment === environmentOption.value,
                    );
                    onQuickSetupChange(
                      matchingProfile
                        ? toOpenClawQuickSetupState(matchingProfile)
                        : {
                            ...createInitialOpenClawQuickSetup(),
                            environment: environmentOption.value,
                            baseUrl: getDefaultOpenClawBaseUrl(
                              environmentOption.value,
                            ),
                            name: getDefaultOpenClawName(
                              environmentOption.value,
                            ),
                          },
                    );
                  }}
                  className={`rounded-2xl border p-4 text-right transition ${
                    openClawQuickSetup.environment === environmentOption.value
                      ? 'border-secondary/25 bg-secondary/10 text-foreground shadow-[0_20px_60px_-48px_rgba(34,199,201,0.42)]'
                      : 'border-border/70 bg-background/72 text-foreground hover:bg-background'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {environmentOption.label}
                  </div>
                  <div className="mt-1 text-xs leading-6 opacity-80">
                    {environmentOption.description}
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
              value={openClawQuickSetup.name}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              placeholder="OpenClaw Tasks Sync"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              agentId
            </label>
            <input
              value={openClawQuickSetup.agentId}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  agentId: event.target.value,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              placeholder="main"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Base URL أو endpoint
            </label>
            <input
              value={openClawQuickSetup.baseUrl}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              placeholder="https://openclaw.example.com أو http://127.0.0.1:18789"
            />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              سيتم تحويله تلقائيًا إلى:{' '}
              <code className="font-mono">
                {normalizeOpenClawAgentUrl(openClawQuickSetup.baseUrl) ||
                  '/hooks/agent'}
              </code>
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Hook Token
            </label>
            <input
              value={openClawQuickSetup.hookToken}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  hookToken: event.target.value,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 font-mono text-foreground focus:border-secondary focus:outline-none"
              placeholder="ocl_hook_..."
            />
            {currentOpenClawProfile?.hasHookToken &&
              !openClawQuickSetup.hookToken.trim() && (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  يمكنك ترك الحقل فارغًا. سيتم استخدام Hook Token المحفوظة
                  لهذه البيئة تلقائيًا.
                </p>
              )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              wake mode
            </label>
            <select
              value={openClawQuickSetup.wakeMode}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  wakeMode: event.target.value as OpenClawWakeMode,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
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
              value={openClawQuickSetup.sessionMode}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  sessionMode: event.target.value as OpenClawSessionMode,
                }))
              }
              className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
            >
              {OPENCLAW_SESSION_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={openClawQuickSetup.deliver}
              onChange={(event) =>
                onQuickSetupChange((current) => ({
                  ...current,
                  deliver: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
            />
            أرسل الرد إلى القناة أيضًا
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onQuickSetupChange(createInitialOpenClawQuickSetup())
            }
            disabled={submittingWebhook || savingOpenClawProfile}
            className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
          >
            إعادة تعيين
          </button>
          <button
            type="button"
            onClick={onApplyQuickSetup}
            disabled={submittingWebhook || savingOpenClawProfile}
            className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            تعبئة النموذج تلقائيًا
          </button>
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={submittingWebhook || savingOpenClawProfile}
            className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingOpenClawProfile
              ? 'جارٍ الحفظ...'
              : currentOpenClawProfile
                ? 'تحديث الإعداد المحفوظ'
                : 'حفظ الإعداد لهذه البيئة'}
          </button>
          <button
            type="button"
            onClick={() => onCreateWebhook(false)}
            disabled={submittingWebhook || savingOpenClawProfile}
            className="rounded-2xl border border-secondary/20 bg-secondary/8 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
          >
            إنشاء webhook الآن
          </button>
          <button
            type="button"
            onClick={() => onCreateWebhook(true)}
            disabled={submittingWebhook || savingOpenClawProfile}
            className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            إنشاء ثم اختبار
          </button>
        </div>
      </div>
    </details>
  );
};
