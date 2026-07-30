import { useTranslation } from 'react-i18next';
import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { WorkspaceNumber } from '../types';

interface UnassignDialogProps {
  open: boolean;
  number: WorkspaceNumber | null;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const UnassignDialog: React.FC<UnassignDialogProps> = ({
  open,
  number,
  saving,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!open || !number) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md animate-slide-up rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground">
          {t('whatsappInbox.confirmUnassignTitle')}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('whatsappInbox.confirmUnassignDescription', {
            number: number.session.name || number.session.phoneNumber,
          })}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('whatsappInbox.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-all duration-200 hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('whatsappInbox.savingRouting')}
              </>
            ) : (
              t('whatsappInbox.unassign')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnassignDialog;