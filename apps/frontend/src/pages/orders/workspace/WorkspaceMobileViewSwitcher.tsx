import React from "react";
import type { WorkspaceOrder } from "./types";

export type WorkspaceView = "queue" | "inspector" | "intelligence";

interface WorkspaceMobileViewSwitcherProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  isArabic: boolean;
  totalOrdersCount: number;
  selectedOrder: WorkspaceOrder | null;
}

export const WorkspaceMobileViewSwitcher: React.FC<
  WorkspaceMobileViewSwitcherProps
> = ({
  activeView,
  onSelectView,
  isArabic,
  totalOrdersCount,
  selectedOrder,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-border/30 bg-muted/15 px-3 py-1.5 md:hidden shrink-0">
      <div className="flex items-center gap-1 rounded-lg bg-background/80 p-0.5 border border-border/40 text-xs font-semibold">
        <button
          type="button"
          data-testid="workspace-view-queue"
          onClick={() => onSelectView("queue")}
          className={`rounded-md px-2.5 py-1 transition-all ${
            activeView === "queue"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isArabic ? "الطابور" : "Queue"} ({totalOrdersCount})
        </button>
        <button
          type="button"
          data-testid="workspace-view-inspector"
          onClick={() => onSelectView("inspector")}
          className={`rounded-md px-2.5 py-1 transition-all ${
            activeView === "inspector"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isArabic ? "التفاصيل" : "Inspector"}{" "}
          {selectedOrder ? `(#${selectedOrder.orderNumber})` : ""}
        </button>
        <button
          type="button"
          data-testid="workspace-view-intelligence"
          onClick={() => onSelectView("intelligence")}
          className={`rounded-md px-2.5 py-1 transition-all ${
            activeView === "intelligence"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isArabic ? "سجل العميل" : "Intelligence"}
        </button>
      </div>
    </div>
  );
};

export default WorkspaceMobileViewSwitcher;
