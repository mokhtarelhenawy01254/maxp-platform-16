import React from "react";
import { AlertTriangle } from "lucide-react";

interface OrdersAnalyticsErrorBarProps {
  error: string;
  onRetry: () => void;
}

export const OrdersAnalyticsErrorBar: React.FC<OrdersAnalyticsErrorBarProps> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="p-2.5 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between gap-3 text-destructive text-xs font-medium">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">{error}</span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="px-2 py-0.5 rounded bg-card border border-border/80 text-foreground hover:bg-accent text-[11px] shrink-0 active:scale-[0.97] transition-all"
      >
        إعادة المحاولة
      </button>
    </div>
  );
};

export default OrdersAnalyticsErrorBar;
