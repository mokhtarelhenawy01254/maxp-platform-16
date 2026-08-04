import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PROBLEM_REASON_OPTIONS } from "../constants";
import type {
  PreparationOrder,
  ProblemHoldDetails,
} from "../types";

interface PreparationStatusChangeDialogProps {
  isOpen: boolean;
  order: PreparationOrder | null;
  targetStatus: string;
  targetStatusLabel: string;
  isHold: boolean;
  initialHoldDetails: ProblemHoldDetails;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    note: string;
    holdDetails?: Partial<ProblemHoldDetails>;
  }) => void;
}

const PreparationStatusChangeDialog = ({
  isOpen,
  order,
  targetStatusLabel,
  isHold,
  initialHoldDetails,
  busy,
  onClose,
  onConfirm,
}: PreparationStatusChangeDialogProps) => {
  const { t } = useTranslation();

  const [note, setNote] = useState("");
  const [reason, setReason] = useState<ProblemHoldDetails["reason"]>(
    initialHoldDetails.reason,
  );
  const [owner, setOwner] = useState(initialHoldDetails.owner);
  const [followUpDate, setFollowUpDate] = useState(
    initialHoldDetails.followUpDate,
  );
  const [customerNotified, setCustomerNotified] = useState(
    initialHoldDetails.customerNotified,
  );
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote(initialHoldDetails.note || "");
      setReason(initialHoldDetails.reason);
      setOwner(initialHoldDetails.owner);
      setFollowUpDate(initialHoldDetails.followUpDate);
      setCustomerNotified(initialHoldDetails.customerNotified);
      setShowError(false);
    }
  }, [isOpen, initialHoldDetails]);

  const handleConfirm = () => {
    if (isHold && !note.trim()) {
      setShowError(true);
      return;
    }

    onConfirm({
      note: note.trim(),
      ...(isHold
        ? {
            holdDetails: {
              reason,
              owner: owner.trim(),
              followUpDate,
              customerNotified,
              note: note.trim(),
            },
          }
        : {}),
    });
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-amber-500";

  return (
    <Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
          {isHold ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              {t("preparation.holdDialog.holdTitle", {
                order: order?.orderNumber || "",
              })}
            </>
          ) : (
            t("preparation.holdDialog.advanceTitle", {
              order: order?.orderNumber || "",
              status: targetStatusLabel,
            })
          )}
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
          {isHold
            ? t("preparation.holdDialog.holdDesc")
            : t("preparation.holdDialog.advanceDesc")}
        </DialogDescription>

        <div className="space-y-3">
          {isHold ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("preparation.holdDialog.reasonLabel")}
                  </span>
                  <select
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value as ProblemHoldDetails["reason"])
                    }
                    className={inputClass}
                  >
                    {PROBLEM_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("preparation.holdDialog.ownerLabel")}
                  </span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder={String(t("preparation.holdDialog.ownerPlaceholder"))}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("preparation.holdDialog.followUpLabel")}
                  </span>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={customerNotified}
                    onChange={(e) => setCustomerNotified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 dark:border-gray-500 dark:text-rose-400"
                  />
                  {t("preparation.holdDialog.customerNotified")}
                </label>
              </div>
            </>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              {isHold
                ? t("preparation.holdDialog.reasonNoteLabel")
                : t("preparation.holdDialog.commentLabel")}
            </span>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (e.target.value.trim()) setShowError(false);
              }}
              rows={3}
              placeholder={String(
                isHold
                  ? t("preparation.holdDialog.reasonNotePlaceholder")
                  : t("preparation.holdDialog.commentPlaceholder"),
              )}
              className={inputClass}
            />
            {isHold && showError && !note.trim() ? (
              <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {t("preparation.holdDialog.reasonRequired")}
              </p>
            ) : null}
          </label>
        </div>

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
            className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${
              isHold
                ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600"
                : "bg-gray-900 hover:bg-gray-800 focus:ring-gray-500 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? t("preparation.holdDialog.saving") : t("preparation.holdDialog.confirm")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreparationStatusChangeDialog;
