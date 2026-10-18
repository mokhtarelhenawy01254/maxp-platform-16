import React from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";

export interface UnseenFilterSectionProps {
  onlyUnseen: boolean;
  onToggleUnseen: (next: boolean) => void;
}

export const UnseenFilterSection: React.FC<UnseenFilterSectionProps> = ({
  onlyUnseen,
  onToggleUnseen,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-foreground block">
              {t("orders.unseen", { defaultValue: "الطلبات غير المقروءة" })}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {t("orders.unseenHint", { defaultValue: "عرض الطلبات الجديدة التي لم تُفتح بعد فقط" })}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={onlyUnseen}
          onClick={() => onToggleUnseen(!onlyUnseen)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            onlyUnseen ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
              onlyUnseen ? "ltr:translate-x-5 rtl:-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default UnseenFilterSection;
