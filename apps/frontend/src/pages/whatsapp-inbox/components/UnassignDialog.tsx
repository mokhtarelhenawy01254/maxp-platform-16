import React from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">
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
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('whatsappInbox.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('whatsappInbox.savingRouting') : t('whatsappInbox.unassign')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnassignDialog;