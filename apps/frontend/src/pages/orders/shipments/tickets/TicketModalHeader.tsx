import React from "react";
import { Ticket, X } from "lucide-react";

export interface TicketModalHeaderProps {
  effectiveOrderNumber: string;
  onClose: () => void;
}

export const TicketModalHeader: React.FC<TicketModalHeaderProps> = ({
  effectiveOrderNumber,
  onClose,
}) => {
  return (
    <div className="p-4 border-b border-border/70 flex items-center justify-between bg-card/80 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span>تذاكر الدعم والمتابعة</span>
            {effectiveOrderNumber && (
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
                طلب #{effectiveOrderNumber}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            متابعة شحنات وطلبات الدعم مع شركة الشحن مباشرة من هذه الصفحة
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted active:scale-95 transition"
        title="إغلاق النافذة"
        aria-label="إغلاق النافذة"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default TicketModalHeader;
