import React from "react";
import { Button } from "../../../components/ui/button";
import { ArrowRight, CalendarRange } from "lucide-react";

interface AssignShiftHeaderProps {
  onBack: () => void;
  dateRangeMode: boolean;
  onToggleDateRangeMode: () => void;
}

export const AssignShiftHeader: React.FC<AssignShiftHeaderProps> = ({
  onBack,
  dateRangeMode,
  onToggleDateRangeMode,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-lg hover:bg-muted/50 shrink-0"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">تعيين مناوبة</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            اختر موظف أو عدة موظفين لتعيينهم في المناوبة المحددة
          </p>
        </div>
      </div>
      <Button
        variant={dateRangeMode ? "default" : "outline"}
        size="sm"
        onClick={onToggleDateRangeMode}
      >
        <CalendarRange className="h-4 w-4 ml-2" />
        {dateRangeMode ? "إلغاء نطاق التاريخ" : "نطاق تاريخ"}
      </Button>
    </div>
  );
};
