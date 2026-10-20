import React from 'react';
import {
  CheckCircleIcon,
  DocumentDuplicateIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { RevealedSecret } from '../types/taskIntegrationTypes';

interface TaskSecretRevealModalProps {
  revealedSecret: RevealedSecret | null;
  onCopySecret: (value: string, message: string) => void;
  onDismissSecret: () => void;
  loadError: string | null;
  onRetryLoad: () => void;
}

export const TaskSecretRevealModal: React.FC<TaskSecretRevealModalProps> = ({
  revealedSecret,
  onCopySecret,
  onDismissSecret,
  loadError,
  onRetryLoad,
}) => {
  return (
    <>
      {revealedSecret && (
        <div className="rounded-[26px] border border-primary/15 bg-primary/6 p-5 shadow-[0_18px_54px_-42px_rgba(47,107,255,0.24)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold">{revealedSecret.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {revealedSecret.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onCopySecret(revealedSecret.value, 'تم نسخ السر إلى الحافظة')
                }
                className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <DocumentDuplicateIcon className="ml-2 h-4 w-4" />
                نسخ الآن
              </button>
              <button
                type="button"
                onClick={onDismissSecret}
                className="inline-flex items-center rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                <EyeSlashIcon className="ml-2 h-4 w-4" />
                إخفاء
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-[20px] border border-primary/15 bg-background/78 p-3">
            <code className="block break-all text-xs leading-6 text-foreground font-mono tabular-nums">
              {revealedSecret.value}
            </code>
          </div>
        </div>
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
              onClick={onRetryLoad}
              className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50"
            >
              <ArrowPathIcon className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}
    </>
  );
};
