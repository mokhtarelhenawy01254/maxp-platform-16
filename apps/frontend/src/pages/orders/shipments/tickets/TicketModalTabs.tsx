import React from "react";
import { Plus, MessagesSquare, ArrowRight } from "lucide-react";

export interface TicketModalTabsProps {
  activeTab: "new" | "list" | "detail";
  setActiveTab: (tab: "new" | "list" | "detail") => void;
  existingTicketsCount: number;
}

export const TicketModalTabs: React.FC<TicketModalTabsProps> = ({
  activeTab,
  setActiveTab,
  existingTicketsCount,
}) => {
  return (
    <div className="px-4 pt-2.5 pb-2 border-b border-border/70 flex items-center gap-2 bg-muted/20 shrink-0">
      <button
        type="button"
        onClick={() => setActiveTab("new")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition ${
          activeTab === "new"
            ? "bg-amber-600 text-white shadow-xs"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>فتح تذكرة جديدة</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("list")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition ${
          activeTab === "list" || activeTab === "detail"
            ? "bg-foreground text-background shadow-xs"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <MessagesSquare className="h-3.5 w-3.5" />
        <span>تذاكر هذا الطلب</span>
        {existingTicketsCount > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono tabular-nums ${
              activeTab === "list" || activeTab === "detail"
                ? "bg-background/20 text-background"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            }`}
          >
            {existingTicketsCount}
          </span>
        )}
      </button>

      {activeTab === "detail" && (
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className="me-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ArrowRight className="h-3 w-3" />
          <span>العودة للقائمة</span>
        </button>
      )}
    </div>
  );
};

export default TicketModalTabs;
