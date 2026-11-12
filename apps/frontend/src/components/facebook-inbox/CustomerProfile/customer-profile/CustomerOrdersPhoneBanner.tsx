import React from "react";
import { Check, Phone, Plus, SquarePen, X } from "lucide-react";

interface CustomerOrdersPhoneBannerProps {
  customer: any;
  editingPhone: boolean;
  phoneDraft: string;
  setPhoneDraft: (val: string) => void;
  savingPhone: boolean;
  phoneUpdateMessage: string | null;
  handleStartEditPhone: () => void;
  handleSavePhone: () => void;
  setEditingPhone: (val: boolean) => void;
  setPhoneUpdateMessage: (val: string | null) => void;
}

export const CustomerOrdersPhoneBanner: React.FC<
  CustomerOrdersPhoneBannerProps
> = ({
  customer,
  editingPhone,
  phoneDraft,
  setPhoneDraft,
  savingPhone,
  phoneUpdateMessage,
  handleStartEditPhone,
  handleSavePhone,
  setEditingPhone,
  setPhoneUpdateMessage,
}) => {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">
        رقم الهاتف
      </h4>
      <div className="flex items-center gap-2 text-sm">
        <Phone size={15} className="shrink-0 text-primary" />
        {editingPhone ? (
          <input
            autoFocus
            type="tel"
            dir="ltr"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSavePhone();
              if (e.key === "Escape") {
                setEditingPhone(false);
                setPhoneUpdateMessage(null);
              }
            }}
            className="flex-1 min-w-0 rounded-md border border-border/60 bg-background px-2 py-1 text-sm font-medium font-mono tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="01xxxxxxxxx"
            disabled={savingPhone}
          />
        ) : customer?.phone ? (
          <span
            className="flex-1 min-w-0 truncate font-mono tabular-nums font-medium text-primary"
            dir="ltr"
          >
            {customer.phone}
          </span>
        ) : (
          <span className="flex-1 min-w-0 text-xs text-muted-foreground">
            لم يتم إضافة رقم هاتف بعد
          </span>
        )}

        {editingPhone ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              title="حفظ رقم الهاتف"
              aria-label="حفظ رقم الهاتف"
            >
              {savingPhone ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
              ) : (
                <Check size={18} strokeWidth={2.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPhone(false);
                setPhoneUpdateMessage(null);
              }}
              disabled={savingPhone}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
              title="إلغاء"
              aria-label="إلغاء"
            >
              <X size={16} />
            </button>
          </div>
        ) : customer?.phone ? (
          <button
            type="button"
            onClick={handleStartEditPhone}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            title="تعديل رقم الهاتف"
            aria-label="تعديل رقم الهاتف"
          >
            <SquarePen size={15} />
          </button>
        ) : null}
      </div>

      {!customer?.phone && !editingPhone && (
        <button
          type="button"
          onClick={handleStartEditPhone}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
          title="إضافة رقم الهاتف"
          aria-label="إضافة رقم الهاتف"
        >
          <Plus size={15} />
          <span>إضافة رقم الهاتف</span>
        </button>
      )}

      {phoneUpdateMessage && (
        <p
          className={`text-xs mt-2 ${
            phoneUpdateMessage.startsWith("تم الحفظ:") || phoneUpdateMessage.includes("تم")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }`}
        >
          {phoneUpdateMessage}
        </p>
      )}
    </div>
  );
};
