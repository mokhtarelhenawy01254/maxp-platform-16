import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface OrderStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  newStatus: string;
  setNewStatus: (val: string) => void;
  statusNotes: string;
  setStatusNotes: (val: string) => void;
  isOverride: boolean;
  setIsOverride: (val: boolean) => void;
  cancellationAdditionalNotes: string;
  setCancellationAdditionalNotes: (val: string) => void;
  returnReason: string;
  setReturnReason: (val: string) => void;
  returnAdditionalNotes: string;
  setReturnAdditionalNotes: (val: string) => void;
  filteredStatusOptions: Array<{ code: string; name: string }>;
  workflowStatusDefs: Array<{ code: string; requiresOverride?: boolean }>;
  hasWorkflowRestrictions: boolean;
  isModalCancellationStatus: boolean;
  isModalReturnStatus: boolean;
  cancellationReasonOptions: Array<{ id: string; reason: string }>;
  cancellationReasonOptionsLoading: boolean;
  commonReturnReasons: string[];
  updating: boolean;
  onUpdateStatus: () => Promise<void>;
}

export const OrderStatusUpdateModal: React.FC<OrderStatusUpdateModalProps> = ({
  isOpen,
  onClose,
  newStatus,
  setNewStatus,
  statusNotes,
  setStatusNotes,
  isOverride,
  setIsOverride,
  cancellationAdditionalNotes,
  setCancellationAdditionalNotes,
  returnReason,
  setReturnReason,
  returnAdditionalNotes,
  setReturnAdditionalNotes,
  filteredStatusOptions,
  workflowStatusDefs,
  hasWorkflowRestrictions,
  isModalCancellationStatus,
  isModalReturnStatus,
  cancellationReasonOptions,
  cancellationReasonOptionsLoading,
  commonReturnReasons,
  updating,
  onUpdateStatus,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200 text-start">
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowPathIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t("orderDetails.updateOrderStatus", { defaultValue: "تحديث حالة الطلب" })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("orderDetails.updateOrderStatusDesc", { defaultValue: "تغيير مرحلة الطلب في مسار العمل" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Status Select */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              {t("orderDetails.selectStatus", { defaultValue: "اختر الحالة الجديدة" })}
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">{t("orderDetails.selectStatus", { defaultValue: "-- اختر الحالة --" })}</option>
              {filteredStatusOptions.map((status) => {
                const wfStatus = workflowStatusDefs.find((ws) => ws.code === status.code);
                const hint = wfStatus?.requiresOverride ? ` (${t("orderDetails.overrideSuffix", { defaultValue: "يتطلب تجاوز" })})` : "";
                return (
                  <option key={status.code} value={status.code}>
                    {status.name}{hint}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Workflow Override Checkbox */}
          {hasWorkflowRestrictions && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="override-checkbox"
                type="checkbox"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
              />
              <label htmlFor="override-checkbox" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                {t("orderDetails.overrideCheckboxLabel", { defaultValue: "تجاوز قيود مسار العمل" })}
              </label>
            </div>
          )}

          {/* Cancellation Fields */}
          {isModalCancellationStatus && (
            <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <label className="block text-xs font-bold text-destructive">
                {t("orderDetails.cancellationReasonRequiredLabel", { defaultValue: "سبب الإلغاء (إلزامي)" })}
              </label>
              {cancellationReasonOptions.length > 0 ? (
                <select
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  disabled={updating || cancellationReasonOptionsLoading}
                  className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-destructive focus:outline-none"
                >
                  <option value="">{t("orderDetails.selectCancellationReason", { defaultValue: "-- اختر سبب الإلغاء --" })}</option>
                  {cancellationReasonOptions.map((reason) => (
                    <option key={reason.id} value={reason.reason}>
                      {reason.reason}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-destructive focus:outline-none"
                  placeholder={String(t("orderDetails.cancellationReasonPlaceholder2", { defaultValue: "اكتب سبب الإلغاء بالتفصيل..." }))}
                />
              )}
              {cancellationReasonOptionsLoading && (
                <p className="text-[11px] text-muted-foreground">
                  {t("orderDetails.loadingReasons", { defaultValue: "جاري تحميل أسباب الإلغاء..." })}
                </p>
              )}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {t("orderDetails.additionalNotesLabel", { defaultValue: "ملاحظات إضافية (اختياري)" })}
                </label>
                <textarea
                  value={cancellationAdditionalNotes}
                  onChange={(e) => setCancellationAdditionalNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  placeholder={String(t("orderDetails.additionalNotesPlaceholder", { defaultValue: "أي تفاصيل أخرى..." }))}
                />
              </div>
            </div>
          )}

          {/* Return Fields */}
          {isModalReturnStatus && (
            <div className="space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                {t("orderDetails.selectReturnReason", { defaultValue: "سبب المرتجع (اختر من الأسباب الشائعة)" })}
              </label>
              <select
                value={returnReason}
                onChange={(e) => {
                  const val = e.target.value;
                  setReturnReason(val);
                  if (val && val !== "other") {
                    setStatusNotes(val);
                  }
                }}
                disabled={updating}
                className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-rose-500 focus:outline-none"
              >
                <option value="">{t("orderDetails.chooseReturnReason", { defaultValue: "-- اختر سبب المرتجع --" })}</option>
                {commonReturnReasons.map((reasonText, idx) => (
                  <option key={idx} value={reasonText}>
                    {reasonText}
                  </option>
                ))}
                <option value="other">{t("orderDetails.otherReason", { defaultValue: "سبب آخر (كتابة مخصصة)" })}</option>
              </select>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {t("orderDetails.returnReasonDetails", { defaultValue: "نص سبب المرتجع بالتفصيل" })}
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-rose-500 focus:outline-none"
                  placeholder={String(t("orderDetails.returnReasonPlaceholder", { defaultValue: "اكتب سبب إرجاع الطلب بالتفصيل هنا..." }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  {t("orderDetails.additionalNotesLabel", { defaultValue: "ملاحظات إضافية (اختياري)" })}
                </label>
                <textarea
                  value={returnAdditionalNotes}
                  onChange={(e) => setReturnAdditionalNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  placeholder={String(t("orderDetails.additionalNotesPlaceholder", { defaultValue: "أي ملاحظات إضافية..." }))}
                />
              </div>
            </div>
          )}

          {/* Generic Notes */}
          {!isModalCancellationStatus && !isModalReturnStatus && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                {t("orderDetails.notesOptional", { defaultValue: "ملاحظات (اختياري)" })}
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder={String(t("orderDetails.notesPlaceholder", { defaultValue: "اكتب أي ملاحظات تتعلق بتغيير الحالة..." }))}
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row-reverse gap-2.5 pt-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-all"
            onClick={onUpdateStatus}
            disabled={
              updating ||
              !newStatus ||
              (isModalCancellationStatus && !statusNotes.trim()) ||
              (isModalReturnStatus && !returnReason.trim() && !statusNotes.trim())
            }
          >
            {updating
              ? t("orderDetails.updating", { defaultValue: "جاري التحديث..." })
              : t("orderDetails.updateStatusButton", { defaultValue: "حفظ وتحديث الحالة" })}
          </button>
          <button
            type="button"
            className="rounded-xl border border-border/70 bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            onClick={onClose}
          >
            {t("orderDetails.cancel", { defaultValue: "إلغاء" })}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default OrderStatusUpdateModal;
