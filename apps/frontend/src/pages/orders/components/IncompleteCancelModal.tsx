import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  RefreshCw,
  Ban,
  Lightbulb,
  User,
  Phone,
  Banknote,
} from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-card text-card-foreground shadow-2xl border border-border/70 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Ban className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {t("orders.incompleteCancelModalTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("orders.incompleteCancelModalDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={t("orders.incompleteCancelDiscardBtn")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {/* Customer / Cart summary chip row */}
          {(customerName || customerPhone || cartTotal != null) && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/20 p-2.5 text-xs text-foreground border border-border/60">
              {customerName && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {customerName}
                </span>
              )}
              {customerPhone && (
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span dir="ltr">{customerPhone}</span>
                </span>
              )}
              {cartTotal != null && (
                <span className="inline-flex items-center gap-1 font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 ms-auto">
                  <Banknote className="h-3.5 w-3.5" />
                  {formatPrice(cartTotal)}
                </span>
              )}
            </div>
          )}

          {/* Save-the-sale incentive tip callout box */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <Lightbulb className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{t("orders.incompleteCancelSaveOfferNotice")}</span>
          </div>

          {/* Quick cancellation reasons chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
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
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.97] ${
                      isSelected
                        ? "border border-destructive/40 bg-destructive/15 text-destructive shadow-2xs"
                        : "border border-border/70 bg-background text-foreground hover:border-destructive/30 hover:bg-muted"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed note */}
          <div className="space-y-1">
            <label
              htmlFor="cancel-note"
              className="block text-xs font-semibold text-foreground"
            >
              {t("orders.incompleteContactNote")}
            </label>
            <textarea
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("orders.incompleteContactNote")}
              rows={3}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs sm:text-sm text-foreground focus:border-destructive focus:ring-2 focus:ring-destructive/15 outline-hidden transition-all resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg border border-border/70 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.97]"
            >
              {t("orders.incompleteCancelDiscardBtn")}
            </button>
            <button
              type="submit"
              disabled={saving || (!selectedReason.trim() && !note.trim())}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs active:scale-[0.97]"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              <span>{t("orders.incompleteCancelConfirmBtn")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncompleteCancelModal;
