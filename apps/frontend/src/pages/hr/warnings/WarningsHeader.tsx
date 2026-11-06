import React from "react";
import { Button } from "../../../components/ui/button";
import { Plus } from "lucide-react";

interface WarningsHeaderProps {
  onNewWarning: () => void;
}

export const WarningsHeader: React.FC<WarningsHeaderProps> = ({
  onNewWarning,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          الإنذارات والمخالفات
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          إدارة ومتابعة المخالفات الإدارية والإجراءات التأديبية
        </p>
      </div>
      <Button
        onClick={onNewWarning}
      >
        <Plus className="h-4 w-4 ml-2" />
        تسجيل مخالفة جديدة
      </Button>
    </div>
  );
};
