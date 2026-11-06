import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FeedbackHeaderProps {
  onNewFeedback: () => void;
}

export const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({
  onNewFeedback,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          التغذية الراجعة 360°
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          نظرة شاملة على الأداء والتفاعل في الشركة
        </p>
      </div>
      <Button
        onClick={onNewFeedback}
        size="sm"
        className="gap-1.5 text-xs font-semibold shadow-xs"
      >
        <Plus className="h-4 w-4" />
        تغذية راجعة جديدة
      </Button>
    </div>
  );
};
