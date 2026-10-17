import React from "react";
import { useTranslation } from "react-i18next";
import { X, FileText, Loader2 } from "lucide-react";

interface IncompleteOrdersContactModalProps {
  open: boolean;
  onClose: () => void;
  contactMethod: string;
  onMethodChange: (method: string) => void;
  contactResult: string;
  onResultChange: (result: string) => void;
  contactNote: string;
  onNoteChange: (note: string) => void;
  savingContact: boolean;
  onSave: () => void;
}

export const IncompleteOrdersContactModal: React.FC<IncompleteOrdersContactModalProps> = ({
  open,
  onClose,
  contactMethod,
  onMethodChange,
  contactResult,
  onResultChange,
  contactNote,
  onNoteChange,
  savingContact,
  onSave,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  const cancelReasons = [
    t("orders.incompleteCancelReasonHighShipping"),
    t("orders.incompleteCancelReasonBoughtElsewhere"),
    t("orders.incompleteCancelReasonNotInterested"),
    t("orders.incompleteCancelReasonPriceHigh"),
    t("orders.incompleteCancelReasonChangedMind"),
    t("orders.incompleteCancelReasonOther"),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-xl shadow-xl border border-border/80 p-5 space-y-4 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {t("orders.incompleteLogContact")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={t("orders.incompleteCancel") as string}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label
              htmlFor="contact-method"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              {t("orders.incompleteContactMethod")}
            </label>
            <select
              id="contact-method"
              value={contactMethod}
              onChange={(e) => onMethodChange(e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-muted/20 text-xs sm:text-sm text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all"
            >
              <option value="call">{t("orders.incompleteCall")}</option>
              <option value="whatsapp">{t("orders.incompleteWhatsApp")}</option>
              <option value="email">{t("orders.incompleteContactEmail")}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="contact-result"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              {t("orders.incompleteContactResult")}
            </label>
            <select
              id="contact-result"
              value={contactResult}
              onChange={(e) => onResultChange(e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-muted/20 text-xs sm:text-sm text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all"
            >
              <option value="">{t("orders.notSpecified")}</option>
              <option value="answered">
                {t("orders.incompleteContactResultAnswered")}
              </option>
              <option value="no_reply">
                {t("orders.incompleteContactResultNoReply")}
              </option>
              <option value="busy">
                {t("orders.incompleteContactResultBusy")}
              </option>
              <option value="wrong_number">
                {t("orders.incompleteContactResultWrongNumber")}
              </option>
              <option value="cancelled">
                {t("orders.incompleteContactResultCancelled")}
              </option>
            </select>
          </div>

          {contactResult === "cancelled" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 space-y-2">
              <p className="text-xs text-destructive">
                {t("orders.incompleteContactCancelledNotice")}
              </p>
              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-destructive">
                  {t("orders.incompleteCancelReasonPrompt")}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {cancelReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        onNoteChange(
                          contactNote ? `${reason} - ${contactNote}` : reason
                        );
                      }}
                      className="rounded-md border border-destructive/30 bg-card px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/15 transition-colors shadow-2xs"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="contact-note"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              {t("orders.incompleteContactNote")}
            </label>
            <textarea
              id="contact-note"
              value={contactNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              placeholder={t("orders.incompleteContactNote")}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-muted/20 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {t("orders.incompleteCancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={savingContact}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingContact ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            <span>
              {savingContact
                ? t("orders.incompleteContactSaving")
                : t("orders.incompleteContactSave")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncompleteOrdersContactModal;
