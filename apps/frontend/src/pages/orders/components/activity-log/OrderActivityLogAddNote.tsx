import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, RotateCw } from "lucide-react";

interface OrderActivityLogAddNoteProps {
  note: string;
  setNote: (value: string) => void;
  onAddNote: () => void;
  addingNote: boolean;
}

export const OrderActivityLogAddNote: React.FC<OrderActivityLogAddNoteProps> = ({
  note,
  setNote,
  onAddNote,
  addingNote,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      <label htmlFor="activity-comment" className="sr-only">
        {t("orderDetails.addNote") || "إضافة ملاحظة"}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          name="activity-comment"
          id="activity-comment"
          rows={2}
          className="shadow-xs focus:ring-1 focus:ring-ring block w-full text-xs border border-border/70 rounded-xl bg-background text-foreground placeholder:text-muted-foreground/70 resize-none p-3 transition-colors"
          placeholder={t("orderDetails.addNotePlaceholder") || "اكتب ملاحظة أو توجيه على الطلب..."}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          onClick={onAddNote}
          disabled={addingNote || !note.trim()}
          className="sm:self-end inline-flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-hidden disabled:opacity-50 transition-colors shrink-0 shadow-xs"
        >
          {addingNote ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t("orderDetails.adding") || "جاري الإضافة..."}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{t("orderDetails.add") || "إضافة"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
