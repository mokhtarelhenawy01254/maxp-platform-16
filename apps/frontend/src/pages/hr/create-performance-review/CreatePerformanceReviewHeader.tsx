import React from "react";
import { BarChart3, ArrowRight, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface CreatePerformanceReviewHeaderProps {
  isEditing: boolean;
  onBack: () => void;
}

export const CreatePerformanceReviewHeader: React.FC<
  CreatePerformanceReviewHeaderProps
> = ({ isEditing, onBack }) => {
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {isEditing ? (
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ) : (
              <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            )}
            {isEditing ? "تعديل تقييم الأداء" : "إنشاء تقييم أداء جديد"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? "قم بتحديث بيانات تقييم الأداء الحالي"
              : "إعداد وتوثيق نموذج تقييم أداء دوري للموظف"}
          </p>
        </div>
      </div>
    </div>
  );
};
