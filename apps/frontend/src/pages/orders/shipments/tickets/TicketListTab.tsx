import React from "react";
import { RotateCw, Ticket, Clock, ArrowLeft, Plus } from "lucide-react";
import type { OrderTicketItem } from "./ticketTypes";
import { getStatusBadge } from "./ticketTypes";

export interface TicketListTabProps {
  loadingTickets: boolean;
  existingTickets: OrderTicketItem[];
  onOpenNewTab: () => void;
  onOpenDetail: (ticket: OrderTicketItem) => void;
}

export const TicketListTab: React.FC<TicketListTabProps> = ({
  loadingTickets,
  existingTickets,
  onOpenNewTab,
  onOpenDetail,
}) => {
  if (loadingTickets) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
        <RotateCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        <p>جاري البحث عن تذاكر هذا الطلب...</p>
      </div>
    );
  }

  if (existingTickets.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
        <div className="h-10 w-10 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
          <Ticket className="h-5 w-5" />
        </div>
        <p className="font-semibold text-foreground text-sm">
          لا توجد تذاكر مسجلة لهذا الطلب حتى الآن
        </p>
        <p className="text-[11px] text-muted-foreground">
          يمكنك فتح تذكرة جديدة للاستفسار عن موعد التسليم أو تقديم شكوى.
        </p>
        <button
          type="button"
          onClick={onOpenNewTab}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition active:scale-95 shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>فتح تذكرة الآن</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden bg-card">
        {existingTickets.map((t) => {
          const badge = getStatusBadge(t.status);
          const lastMsg =
            t.last_message?.content ||
            t.last_message?.message ||
            t.subject ||
            "لا توجد رسائل";

          return (
            <div
              key={t.id}
              onClick={() => onOpenDetail(t)}
              className="p-3.5 bg-card hover:bg-muted/40 cursor-pointer transition flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground tabular-nums">
                    #{t.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  {t.code && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                      {t.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground truncate font-medium">
                  {lastMsg}
                </p>
                {t.created_at && (
                  <p className="text-[10px] text-muted-foreground font-mono tabular-nums flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(t.created_at).toLocaleString("ar-EG")}</span>
                  </p>
                )}
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0 font-semibold flex items-center gap-1">
                <span>عرض المحادثة</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TicketListTab;
