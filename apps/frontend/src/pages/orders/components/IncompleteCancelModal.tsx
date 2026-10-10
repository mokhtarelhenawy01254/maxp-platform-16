import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  XMarkIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  LightBulbIcon,
  UserIcon,
  PhoneIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { cancellationService } from "../../../services/cancellationService";
import { useCurrency } from "../../../hooks/useCurrency";

export interface IncompleteCancelModalProps {
  open: boolean;
  cartId: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  cartTotal?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const IncompleteCancelModal: React.FC<IncompleteCancelModalProps> = ({
  open,
  cartId,
  customerName,
  customerPhone,
  cartTotal,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dynamicReasons, setDynamicReasons] = useState<string[]>([]);

  // Load cancellation reasons from cancellationService if available
  useEffect(() => {
    let active = true;
    if (open) {
      setSelectedReason("");
      setNote("");
      cancellationService
        .getReasons()
        .then((res) => {
          if (active && res.data && Array.isArray(res.data)) {
            const reasons = res.data
              .filter((r) => r.isActive !== false && r.reason)
              .map((r) => r.reason.trim());
            if (reasons.length > 0) {
              setDynamicReasons(reasons);
            }
          }
        })
        .catch(() => {
          // Fallback to standard reasons silently
        });
    }
    return () => {
      active = false;
    };
  }, [open]);

  const standardReasons = useMemo(
    () => [
      t("orders.incompleteCancelReasonHighShipping"),
      t("orders.incompleteCancelReasonBoughtElsewhere"),
      t("orders.incompleteCancelReasonNotInterested"),
      t("orders.incompleteCancelReasonPriceHigh"),
      t("orders.incompleteCancelReasonChangedMind"),
      t("orders.incompleteCancelReasonOther"),
    ],
    [t]
  );

  const allReasons = useMemo(() => {
    const list = [...standardReasons];
    for (const r of dynamicReasons) {
      if (r && !list.includes(r)) {
        list.push(r);
      }
    }
    return list;
  }, [standardReasons, dynamicReasons]);

  if (!open || !cartId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason.trim();
    const finalNote = note.trim();

    if (!finalReason && !finalNote) {
      toast.error(t("orders.incompleteCancelReasonRequired"));
      return;
    }

    const combinedReason =
      finalReason + (finalNote ? (finalReason ? " - " : "") + finalNote : "");

    setSaving(true);
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `/orders-new/incomplete/${encodeURIComponent(cartId)}/dismiss`,
        {
          reason: combinedReason,
          method: "call",
          result: "cancelled",
        }
      );

      if (response.data?.success) {
        toast.success(t("orders.incompleteCancelSuccess"));
        onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || t("orders.incompleteCancelFailed"));
      }
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteCancelFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <NoSymbolIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                {t("orders.incompleteCancelModalTitle")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("orders.incompleteCancelModalDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label={t("orders.incompleteCancelDiscardBtn")}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Customer / Cart summary chip row */}
          {(customerName || customerPhone || cartTotal != null) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/60 dark:text-gray-300 border border-gray-100 dark:border-gray-800">
              {customerName && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                  {customerName}
                </span>
              )}
              {customerPhone && (
                <span className="inline-flex items-center gap-1 font-mono text-gray-600 dark:text-gray-400">
                  <PhoneIcon className="h-3.5 w-3.5 text-gray-400" />
                  <span dir="ltr">{customerPhone}</span>
                </span>
              )}
              {cartTotal != null && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 ms-auto">
                  <CurrencyDollarIcon className="h-3.5 w-3.5" />
                  {formatPrice(cartTotal)}
                </span>
              )}
            </div>
          )}

          {/* Save-the-sale incentive tip callout box */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/15 dark:text-amber-200 flex items-start gap-2.5">
            <LightBulbIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{t("orders.incompleteCancelSaveOfferNotice")}</span>
          </div>

          {/* Quick cancellation reasons chips */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("orders.incompleteCancelReasonPrompt")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allReasons.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(isSelected ? "" : reason)}
                    className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300 shadow-sm"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed note */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-note"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {t("orders.incompleteContactNote")}
            </label>
            <textarea
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("orders.incompleteContactNote")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 outline-none transition-all resize-none text-gray-900 dark:text-white"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t("orders.incompleteCancelDiscardBtn")}
            </button>
            <button
              type="submit"
              disabled={saving || (!selectedReason.trim() && !note.trim())}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <NoSymbolIcon className="h-4 w-4" />
              )}
              {t("orders.incompleteCancelConfirmBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncompleteCancelModal;
