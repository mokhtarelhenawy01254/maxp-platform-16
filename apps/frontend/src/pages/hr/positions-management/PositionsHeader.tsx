import React from "react";
import { Button } from "../../../components/ui/button";
import { Briefcase, Plus, ArrowRight } from "lucide-react";

interface PositionsHeaderProps {
  onBack: () => void;
  onNewPosition: () => void;
}

export const PositionsHeader: React.FC<PositionsHeaderProps> = ({
  onBack,
  onNewPosition,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            إدارة المناصب
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            إضافة وتعديل وحذف وتصنيف المناصب الوظيفية
          </p>
        </div>
      </div>
      <Button onClick={onNewPosition}>
        <Plus className="h-4 w-4 ml-2" />
        منصب جديد
      </Button>
    </div>
  );
};
