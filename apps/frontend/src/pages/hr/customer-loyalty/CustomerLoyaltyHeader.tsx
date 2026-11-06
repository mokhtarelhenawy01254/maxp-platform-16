import React from "react";
import { Heart, RefreshCw, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface CustomerLoyaltyHeaderProps {
  onRefresh: () => void;
  onCreateProgram: () => void;
}

export const CustomerLoyaltyHeader: React.FC<CustomerLoyaltyHeaderProps> = ({
  onRefresh,
  onCreateProgram,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
          <Heart className="size-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
            ولاء العملاء
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            إدارة برامج ولاء العملاء ومكافآتهم
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-1.5 text-xs font-semibold">
          <RefreshCw className="size-4" />
          تحديث
        </Button>
        <Button
          size="sm"
          type="button"
          onClick={onCreateProgram}
          className="gap-1.5 text-xs font-semibold shadow-xs"
        >
          <Plus className="size-4" />
          برنامج جديد
        </Button>
      </div>
    </div>
  );
};
