import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DeleteState } from "../types/whatsAppSettingsTypes";

interface WhatsAppDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteState: DeleteState | null;
  keepHistory: boolean;
  setKeepHistory: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  onConfirmDelete: () => void;
  onClose: () => void;
}

export const WhatsAppDeleteDialog: React.FC<WhatsAppDeleteDialogProps> = ({
  open,
  onOpenChange,
  deleteState,
  keepHistory,
  setKeepHistory,
  saving,
  onConfirmDelete,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <AlertDialogContent
        size="sm"
        className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-200">
            <Trash2 className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("whatsappSettings.delete")}</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteState?.kind === "session"
              ? t("whatsappSettings.dialogs.deleteConfirmSession")
              : deleteState?.kind === "quickReply"
              ? t("whatsappSettings.dialogs.deleteConfirmQuickReply")
              : t("whatsappSettings.dialogs.deleteConfirmLabel")}
          </AlertDialogDescription>
          {deleteState?.kind === "session" && (
            <div className="flex items-center space-x-2 pt-2 sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2">
              <Checkbox
                id="keepHistory"
                checked={keepHistory}
                onCheckedChange={(checked) => setKeepHistory(!!checked)}
              />
              <Label
                htmlFor="keepHistory"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("whatsappSettings.dialogs.keepHistoryDeleteDialog")}
              </Label>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-3xl border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:var(--color-muted)]">
          <AlertDialogCancel onClick={onClose}>
            {t("whatsappSettings.dialogs.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={saving}
            onClick={onConfirmDelete}
          >
            {saving ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("whatsappSettings.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
