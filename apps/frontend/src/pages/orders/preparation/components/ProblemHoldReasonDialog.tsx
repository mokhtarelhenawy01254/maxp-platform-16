import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PreparationOrder } from "../types";

interface ProblemHoldReasonDialogProps {
  isOpen: boolean;
  order: PreparationOrder | null;
  initialReason: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const ProblemHoldReasonDialog = ({
  isOpen,
  order,
  initialReason,
  busy,
  onClose,
  onConfirm,
}: ProblemHoldReasonDialogProps) => {
  const { t } = useTranslation();

  const [reason, setReason] = useState(initialReason);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
      setShowError(false);
    }
  }, [isOpen, initialReason]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setShowError(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {t("preparation.holdReasonDialog.title", {
            order: order?.orderNumber || "",
          })}
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
          {t("preparation.holdReasonDialog.desc")}
        </DialogDescription>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("preparation.holdDialog.reasonLabel")}
          </span>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setShowError(false);
            }}
            rows={3}
            autoFocus
            placeholder={String(t("preparation.holdDialog.reasonPlaceholder"))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-500"
          />
          {showError && !reason.trim() ? (
            <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              {t("preparation.holdDialog.reasonRequired")}
            </p>
          ) : null}
        </label>

        <div className="-mx-4 -mb-4 mt-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-gray-50 dark:bg-gray-700/50 p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:mt-0 sm:ml-3 sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            {t("preparation.holdDialog.cancel")}
          </button>
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-amber-500 dark:hover:bg-amber-600"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? t("preparation.holdDialog.saving") : t("preparation.problemPanel.save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProblemHoldReasonDialog;
