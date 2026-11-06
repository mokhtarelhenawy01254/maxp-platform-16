import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface EmployeesPromotionHeaderProps {
  onNewPromotion: () => void;
}

export const EmployeesPromotionHeader: React.FC<
  EmployeesPromotionHeaderProps
> = ({ onNewPromotion }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">ترقيات الموظفين</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          إدارة ومتابعة ترقيات الموظفين والمستويات الوظيفية
        </p>
      </div>
      <Button onClick={onNewPromotion}>
        <Plus className="h-4 w-4 ml-2" />
        ترقية جديدة
      </Button>
    </div>
  );
};
